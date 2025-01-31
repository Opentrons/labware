import argparse
import base64
import datetime
import subprocess
from dataclasses import dataclass
from typing import Any, Dict, List

import boto3
import docker
from api.settings import Settings, get_settings_from_json
from pydantic import SecretStr
from rich import print
from rich.prompt import Prompt

ENVIRONMENTS = ["staging", "prod"]


def get_aws_account_id() -> str:
    sts_client = boto3.client("sts")
    response = sts_client.get_caller_identity()
    return str(response["Account"])


def get_aws_region() -> str:
    session = boto3.session.Session()
    return session.region_name


@dataclass(frozen=True)
class BaseDeploymentConfig:
    ENV: str
    IMAGE_NAME: str  # local image name
    ECR_URL: str
    ECR_REPOSITORY: str
    CLUSTER_NAME: str
    SERVICE_NAME: str
    CONTAINER_NAME: str
    ENV_VARIABLES_SECRET_NAME: str  # key/value secret as the source of truth for environment variables in the deployed environment
    TAG: str = "not set"
    DEPLOYMENT_TIMEOUT_S: int = 600
    DEPLOYMENT_POLL_INTERVAL_S: int = 20


@dataclass(frozen=True)
class StagingDeploymentConfig(BaseDeploymentConfig):
    ENV: str = "staging"
    ECR_REPOSITORY: str = "staging-ecr-repo"
    ECR_URL: str = f"{get_aws_account_id()}.dkr.ecr.{get_aws_region()}.amazonaws.com"
    IMAGE_NAME: str = "staging-ai-server"
    CLUSTER_NAME: str = "staging-ai-cluster"
    SERVICE_NAME: str = "staging-ai-service"
    CONTAINER_NAME: str = "staging-ai-api"
    ENV_VARIABLES_SECRET_NAME: str = "staging-environment-variables"


@dataclass(frozen=True)
class ProdDeploymentConfig(BaseDeploymentConfig):
    ENV: str = "prod"
    ECR_REPOSITORY: str = "prod-ecr-repo"
    ECR_URL: str = f"{get_aws_account_id()}.dkr.ecr.{get_aws_region()}.amazonaws.com"
    IMAGE_NAME: str = "prod-ai-server"
    CLUSTER_NAME: str = "prod-ai-cluster"
    SERVICE_NAME: str = "prod-ai-service"
    CONTAINER_NAME: str = "prod-ai-api"
    ENV_VARIABLES_SECRET_NAME: str = "prod-environment-variables"


class Deploy:
    def __init__(self, config: BaseDeploymentConfig) -> None:
        self.config: BaseDeploymentConfig = config
        self.ecr_client = boto3.client("ecr")
        self.ecs_client = boto3.client("ecs")
        self.secret_manager_client = boto3.client("secretsmanager")
        self.docker_client = docker.from_env()
        self.full_image_name = f"{self.config.ECR_URL}/{self.config.ECR_REPOSITORY}:{self.config.TAG}"
        self.env_variables: Settings = self.retrieve_environment_variables()

    def build_docker_image(self) -> None:
        print(f"Building Docker image {self.config.IMAGE_NAME}:{self.config.TAG}")
        self.docker_client.images.build(path=".", tag=f"{self.config.IMAGE_NAME}:{self.config.TAG}")
        print(f"Successfully built {self.config.IMAGE_NAME}:{self.config.TAG}")

    def push_docker_image_to_ecr(self) -> None:
        # Get the ECR login token
        response = self.ecr_client.get_authorization_token()
        ecr_token = response["authorizationData"][0]["authorizationToken"]
        # Decode the authorization token
        username, password = base64.b64decode(ecr_token).decode("utf-8").split(":")
        # Log into Docker using --password-stdin
        login_command = f"docker login --username {username} --password-stdin {self.config.ECR_URL}"
        print(f"Logging into ECR {self.config.ECR_URL}")
        process = subprocess.Popen(login_command.split(), stdin=subprocess.PIPE)
        process.communicate(input=password.encode())
        if process.returncode != 0:
            print("Error logging into Docker")
            exit(1)
        # Tag the image
        subprocess.run(["docker", "tag", f"{self.config.IMAGE_NAME}:{self.config.TAG}", self.full_image_name], check=True)
        # Push the image
        subprocess.run(["docker", "push", self.full_image_name], check=True)
        print(f"Image pushed to ECR: {self.full_image_name}")

    def retrieve_environment_variables(self) -> Settings:
        # Retrieve the environment variables from the secret manager.
        # They are not secrets, but are stored in the secret manager as a json string.
        # This gives us a source of truth for the environment variables.
        # We push the json string from secrets manager through the settings model to validate.
        secret_value = self.secret_manager_client.get_secret_value(SecretId=self.config.ENV_VARIABLES_SECRET_NAME)
        return get_settings_from_json(secret_value.get("SecretString"))

    def update_environment_variables(self, environment_variables: List[Dict[str, str]], key: str, value: str) -> List[Dict[str, str]]:
        """
        Updates the environment variables list with the given key and value.
        Ensures that the list has unique keys.
        If the key exists, its value is updated. If it does not exist, a new dictionary is appended.
        """
        # Create a dictionary from the list to ensure unique keys
        env_vars_dict = {env_var["name"].upper(): env_var["value"] for env_var in environment_variables}

        # Update the dictionary with the new key-value pair
        env_vars_dict[key.upper()] = value

        # Convert the dictionary back to a list of dictionaries
        updated_environment_variables = [{"name": k, "value": v} for k, v in env_vars_dict.items()]

        return updated_environment_variables

    def get_secret_arn(self, secret_name: str) -> str:
        response = self.secret_manager_client.describe_secret(SecretId=secret_name)
        return str(response["ARN"])

    def update_secrets_in_container_definition(self, container_definition: dict[str, Any]) -> None:
        expected_secrets = {field.upper() for field, field_type in self.env_variables.__annotations__.items() if field_type == SecretStr}
        print(f"Expected secrets: {expected_secrets}")

        task_secrets = {secret["name"].upper() for secret in container_definition.get("secrets", [])}
        print(f"Existing secrets: {task_secrets}")

        if not task_secrets:
            raise ValueError("No secrets found in the api container definition ...")

        unexpected_secrets = [secret.upper() for secret in task_secrets if secret not in expected_secrets]
        if unexpected_secrets:
            raise ValueError(f"Secrets found in the api container definition that are NOT in Settings: {', '.join(unexpected_secrets)}")

        missing_secrets = [secret.upper() for secret in expected_secrets if secret.upper() not in task_secrets]

        if missing_secrets:
            print(f"Missing secrets: {missing_secrets}")
            for secret in missing_secrets:
                print(f"Adding missing secret: {secret}")
                # secret name is the same as the property name
                # of the secret in the Settings class
                # but with _ replaced with -
                secret_name = f"{self.config.ENV}-{secret.lower().replace("_", "-")}"
                value_from = self.get_secret_arn(secret_name)
                # name is the all caps version of the secret name
                # valueFrom is the ARN of the secret
                new_secret = {"name": secret, "valueFrom": value_from}
                container_definition["secrets"].append(new_secret)
        else:
            print("No secrets need to be added.")

    def update_ecs_task(self, dry: bool) -> None:
        print(f"Updating ECS task with new image: {self.full_image_name}")
        response = self.ecs_client.describe_services(cluster=self.config.CLUSTER_NAME, services=[self.config.SERVICE_NAME])
        task_definition_arn = response["services"][0]["taskDefinition"]

        task_definition = self.ecs_client.describe_task_definition(taskDefinition=task_definition_arn)["taskDefinition"]
        container_definitions = task_definition["containerDefinitions"]
        for container_definition in container_definitions:
            # ENV--datadog-agent container has one secret and 2 environment variables
            # ENV--log-router container has no secrets or environment variables
            # These are managed in the infra repo, NOT here
            if container_definition["name"] == self.config.CONTAINER_NAME:
                container_definition["image"] = self.full_image_name
                environment_variables = container_definition.get("environment", [])
                # set the environment variables for the environment
                for key, value in self.env_variables.model_dump().items():
                    if not isinstance(value, SecretStr):
                        # Secrets are not set here
                        # They are set in the secrets key of the containerDefinition
                        environment_variables = self.update_environment_variables(environment_variables, key, value)
                # Overwrite the DD_VERSION environment variable
                # with the current deployment tag
                # this is what we are using for version currently
                environment_variables = self.update_environment_variables(environment_variables, "DD_VERSION", self.config.TAG)
                container_definition["environment"] = environment_variables
                # Update the secrets in the container definition
                self.update_secrets_in_container_definition(container_definition)
                print("Updated container definition:")
                print(container_definition)
                break
        # https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html#fargate-tasks-size
        new_task_definition = {
            "family": task_definition["family"],
            "containerDefinitions": container_definitions,
            "volumes": task_definition["volumes"],
            "taskRoleArn": task_definition["taskRoleArn"],
            "executionRoleArn": task_definition["executionRoleArn"],
            "networkMode": task_definition["networkMode"],
            "requiresCompatibilities": task_definition["requiresCompatibilities"],
            "cpu": self.env_variables.cpu,
            "memory": self.env_variables.memory,
        }
        print("New task definition:")
        print(new_task_definition)

        if dry:
            print("Dry run, not updating the ECS task.")
            return

        register_response = self.ecs_client.register_task_definition(**new_task_definition)
        new_task_definition_arn = register_response["taskDefinition"]["taskDefinitionArn"]

        self.ecs_client.update_service(
            cluster=self.config.CLUSTER_NAME,
            service=self.config.SERVICE_NAME,
            taskDefinition=new_task_definition_arn,
            forceNewDeployment=True,
        )
        print(f"Deployment to {self.config.ENV} started.")
        print("The API container definition was updated.")
        print("A new Task definition was defined and registered.")
        print("Then we told the ECS service to deploy the new definition.")
        print("Monitor the deployment in the ECS console.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Manage ECS Fargate deployment.")
    parser.add_argument("--env", type=str, help=f"Deployment environment {ENVIRONMENTS}")
    parser.add_argument("--tag", type=str, help="The tag and therefore version of the container to use")
    # action="store_true" sets args.dry to True only if --dry is provided on the command line
    parser.add_argument("--dry", action="store_true", help="Dry run, do not make any changes")
    args = parser.parse_args()

    if args.env:
        if args.env.lower() not in ENVIRONMENTS:
            print(f"[red]Invalid environment specified: {args.env}[/red]")
            exit(1)
        env = args.env.lower()
        if args.tag:
            tag = args.tag
        else:
            if args.env:
                tag = str(int(datetime.datetime.now().timestamp()))
    else:
        # Interactive prompts if env not set
        env = Prompt.ask("[bold magenta]Enter the deployment environment[/]", choices=ENVIRONMENTS, default="crt")
        tag = Prompt.ask(
            "[bold magenta]Enter tag for the container that also becomes the version.[/]",
            default=str(int(datetime.datetime.now().timestamp())),
        )

    # Validate environment
    config: BaseDeploymentConfig
    if env == "prod":
        config = ProdDeploymentConfig(TAG=tag)
    elif env == "staging":
        config = StagingDeploymentConfig(TAG=tag)
    else:
        print(f"[red]Invalid environment specified: {env}[/red]")
        exit(1)
    aws = Deploy(config)
    aws.build_docker_image()
    if args.dry:
        print("Dry run, not pushing image to ECR.")
    else:
        aws.push_docker_image_to_ecr()
        print(f"A new image was built and pushed to ECR with tag: {tag}")
    aws.update_ecs_task(dry=args.dry)


if __name__ == "__main__":
    main()
