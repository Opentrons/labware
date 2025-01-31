# Opentrons AI Backend

## Overview

The Opentrons AI server is a FastAPI server that handles complex tasks like running generative AI models and integrating with the OpenAI API. One challenge we faced was the long processing time for chat completion, which can take 1-3 minutes. This ruled out serverless options like Lambda, as they typically have strict time limits. Ultimately, we opted for a robust architecture using CloudFront, a load balancer, and an ECS Fargate container running our FastAPI server. This robust architecture ensures reliable performance and scalability, allowing users to seamlessly interact with our AI-powered tools and automate their lab workflows.

## Deployed Environments

Currently we have 2 environments: `staging` and `prod`.

- staging: <https://staging.opentrons.ai>
- prod: <https://ai.opentrons.com>

### Environment Variables and Secrets

The opentrons-ai-server/api/settings.py file manages environment variables and secrets. Locally, a .env file (which is ignored by git) stores these values. For deployed environments, AWS Secrets Manager handles both secrets and environment variables. Our deploy script uses the settings class to ensure ECS Fargate loads these values correctly. Important: Update the settings class whenever you add new environment variables or secrets; otherwise, the deploy script will fail.

> Note: To update and environment variable or secret you must update the value in AWS secrets manager AND redeploy the service. Environment variables and secrets are not dynamically updated in the deployed environment. They are loaded at service start up.

## Developing

- This folder is **not** plugged into the global Make ecosystem. This is intentional, this is a serverless application not tied to the Robot Stack dependencies.

### Setup

1. clone the repository `gh repo clone Opentrons/opentrons`.
1. `cd opentrons/opentrons-ai-server`
1. Have pyenv installed per [DEV_SETUP.md](../DEV_SETUP.md).
1. Use pyenv to install python `pyenv install 3.12.6` or latest 3.12.\*.
1. Have nodejs and yarn installed per [DEV_SETUP.md](../DEV_SETUP.md).
   1. This allows formatting of of `.md` and `.json` files.
1. select the python version `pyenv local 3.12.6`.
   1. This will create a `.python-version` file in this directory.
1. select the node version with `nvs` or `nvm` currently 22.11\*.
1. Install pipenv and python dependencies using `make setup`.
1. Install docker if you plan to run and build the docker container locally.
1. `make teardown` will remove the virtual environment but requires pipenv to be installed.

### Run locally

> The server may be run locally with or without Docker. Run without docker to test changes quickly. Run with docker to test in a more production like environment.

#### Without Docker

1. get the .env file from a team member
1. in the `opentrons-ai-server` directory
1. `make local-run`

#### With Docker

In the deployed environments the FastAPI server is run in a docker container. To run the server locally in a docker container:

1. get the .env file from a team member
1. put the .env file in the `opentrons-ai-server` directory
1. in the `opentrons-ai-server` directory
1. `make rebuild`

Now the API is running at <http://localhost:8000>
View the API docs in a browser at <http://localhost:8000/docs>

##### Docker shell

1. make clean
1. make build
1. make run-shell
1. make shell

Now you are in the docker container and can inspect the environment and such.

#### Direct API Interaction and Authentication

> There is only 1 endpoint with the potential to call the OpenAI API. This is the `/api/chat/completion` endpoint. This endpoint requires authentication and the steps are outlined below. In the POST request body setting `"fake": true` will short circuit the handling of the call. The OpenAI API will not be hit. Instead, a hard coded response is returned. We plan to extend this capability to allow for live local testing of the UI without calling the OpenAI API.

To access the `/api/chat/completion` API endpoint, you will need to provide an Authorization header in your API calls.
`"Authorization": "Bearer YOUR_TOKEN"`

1. get the file `test.env` from a team member
1. put the `test.env` file in the `opentrons-ai-server/tests/helpers` directory
1. run `make live-client` and select local for the environment
1. a token will now be cached `opentrons-ai-server/tests/helpers/cached_token.txt` directory
1. use this token in the Authorization header of your favorite API client

#### Live Tests

The live-test target will run tests against any environment. The default is local. The environment can be set by setting the ENV variable.

1. have the server running locally
1. run `make live-test`
1. You should see the tests run and pass against the local environment

#### API Access from the UI

1. Follow the directions in the [opentrons-ai-client README](../opentrons-ai-client/README.md) to run the UI locally
1. The UI is running at <http://localhost:5173/> when you load this it will redirect you to the login page
1. It should start with <https://identity.auth-dev.opentrons.com/>
1. Create an account or login with your existing account
1. You will be redirected back to the UI
1. Your token (JWT) will be stored in the browser local storage and used for all API calls
1. The local dev API actually validates this real token.

## Dev process

1. run the server locally `make run-local`
1. do development
1. `make fixup` formats, lints, and runs mypy
1. `make pre-commit` does what CI will do
1. `make build` to make sure that the docker container builds
1. `make run` to make sure the docker container runs
1. test locally `make live-test` (ENV=local is the default in the Makefile)
1. use the live client `make live-client`, your favorite API tool, or the UI to test the API
1. commit and push your changes and create a PR pointing at the `edge` branch
1. CI passes and a team member reviews your PR
1. when your PR is merged to `edge` it will be automatically deployed to the staging environment

## Install a dev dependency

`python -m pipenv install pytest==8.2.0 --dev`

## Install a production dependency

`python -m pipenv install openai==1.25.1`

## Upgrade a dependency

1. alter the `Pipfile` to the new pinned version
1. run `make setup` to update the `Pipfile.lock`

## Google Sheets Integration

1. Create a Google Cloud Platform project
1. Enable the Google Sheets and Drive API
1. Go to APIs & Services > Library and enable the Google Sheets API.
1. Go to APIs & Services > Credentials and create a Service Account. This account will be used by your application to access the Google Sheets API.
1. After creating the Service Account, click on it in the Credentials section, go to the Keys tab, and create a JSON key. This will download a JSON file with credentials for your Service Account.
1. Open the JSON file and store its content securely. You’ll set this JSON content as an environment variable.
1. Configure Access to the Google Sheet
1. Open the Google Sheet you want to access.
1. Click Share and add the Service Account email (found in the JSON file under "client_email") as a collaborator, typically with Editor access. This allows the Service Account to interact with the sheet.

### Test that the credentials work with a direct call to the Integration

```shell
make test-googlesheet
```

## Add Secrets or Environment Variables

1. Define the new secret or environment variable in the `api/settings.py` file.
1. Add the new secret or environment variable to your local `.env` file.
1. Test locally.
1. Log into the AWS console and navigate to the Secrets Manager.
1. Environment variables are added into the json secret named ENV_VARIABLES_SECRET_NAME in deploy.py for a given environment.
1. Environment variables MUST be named the same as the property in the Settings class.
1. Secret names MUST be the same as the property in the Settings class but with \_ replaced with - and prefixed with the environment name-.
1. The deploy script will load the environment variables from the secret and set them in the container definition.
1. The deploy script will map the secrets from Settings and match them to the container secrets.
1. If any secrets are missing, the deploy script with retrieve the secret ARN and set the secret in the container definition.

## AWS Deployment

Locally test the deployment script like so:

```shell
AWS_PROFILE=robotics_ai_staging make dry-deploy ENV=staging
```

Locally deploy to the staging environment like so:

```shell
AWS_PROFILE=robotics_ai_staging make deploy ENV=staging
```
