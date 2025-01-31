import uuid
from pathlib import Path
from typing import Any, Dict, List, Literal

import requests
import structlog
import weave  # type: ignore
from anthropic import Anthropic
from anthropic.types import Message, MessageParam
from ddtrace import tracer

from api.domain.config_anthropic import DOCUMENTS, PROMPT, SYSTEM_PROMPT
from api.settings import Settings

weave.init("opentronsai/OpentronsAI-Phase-2")
settings: Settings = Settings()
logger = structlog.stdlib.get_logger(settings.logger_name)
ROOT_PATH: Path = Path(Path(__file__)).parent.parent.parent


class AnthropicPredict:
    def __init__(self, settings: Settings) -> None:
        self.settings: Settings = settings
        self.client: Anthropic = Anthropic(api_key=settings.anthropic_api_key.get_secret_value())
        self.model_name: str = settings.anthropic_model_name
        self.system_prompt: str = SYSTEM_PROMPT
        self.path_docs: Path = ROOT_PATH / "api" / "storage" / "docs"
        self.cached_docs: List[MessageParam] = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": DOCUMENTS.format(doc_content=self.get_docs()), "cache_control": {"type": "ephemeral"}}  # type: ignore
                ],
            }
        ]
        self.tools: List[Dict[str, Any]] = [
            {
                "name": "simulate_protocol",
                "description": "Simulates the python protocol on user input. Returned value is text indicating if protocol is successful.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "protocol": {"type": "string", "description": "protocol in python for simulation"},
                    },
                    "required": ["protocol"],
                },
            }
        ]

    @tracer.wrap()
    def get_docs(self) -> str:
        """
        Processes documents from a directory and returns their content wrapped in XML tags.
        Each document is wrapped in <document> tags with metadata subtags.

        Returns:
            str: XML-formatted string containing all documents and their metadata
        """
        logger.info("Getting docs", extra={"path": str(self.path_docs)})
        xml_output = ["<documents>"]
        for file_path in self.path_docs.iterdir():
            try:
                content = file_path.read_text(encoding="utf-8")
                document_xml = [
                    "<document>",
                    f"  <source>{file_path.name}</source>",
                    "   <document_content>",
                    f"    {content}",
                    "   </document_content>",
                    "</document>",
                ]
                xml_output.extend(document_xml)

            except Exception as e:
                logger.error("Error procesing file", extra={"file": file_path.name, "error": str(e)})
                continue

        xml_output.append("</documents>")
        return "\n".join(xml_output)

    @tracer.wrap()
    def _process_message(
        self, user_id: str, messages: List[MessageParam], message_type: Literal["create", "update"], max_tokens: int = 4096
    ) -> Message:
        """
        Internal method to handle message processing with different system prompts.
        For now, system prompt is the same.
        """

        response: Message = self.client.messages.create(
            model=self.model_name,
            system=self.system_prompt,
            max_tokens=max_tokens,
            messages=messages,
            tools=self.tools,  # type: ignore
            extra_headers={"anthropic-beta": "prompt-caching-2024-07-31"},
            metadata={"user_id": user_id},
            temperature=0.0,
        )

        logger.info(
            f"Token usage: {message_type.capitalize()}",
            extra={
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "cache_read": getattr(response.usage, "cache_read_input_tokens", "---"),
                "cache_create": getattr(response.usage, "cache_creation_input_tokens", "---"),
            },
        )
        return response

    @tracer.wrap()
    def process_message(
        self, user_id: str, prompt: str, history: List[MessageParam] | None = None, message_type: Literal["create", "update"] = "create"
    ) -> str | None:
        """Unified method for creating and updating messages"""
        try:
            messages: List[MessageParam] = self.cached_docs.copy()
            if history:
                messages += history

            messages.append({"role": "user", "content": PROMPT.format(USER_PROMPT=prompt)})
            response = self._process_message(user_id=user_id, messages=messages, message_type=message_type)

            if response.content[-1].type == "tool_use":
                tool_use = response.content[-1]
                messages.append({"role": "assistant", "content": response.content})
                result = self.handle_tool_use(tool_use.name, tool_use.input)  # type: ignore
                messages.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_use.id,
                                "content": result,
                            }
                        ],
                    }
                )
                follow_up = self._process_message(user_id=user_id, messages=messages, message_type=message_type)
                return follow_up.content[0].text  # type: ignore

            elif response.content[0].type == "text":
                return response.content[0].text

            logger.error("Unexpected response type")
            return None
        except Exception as e:
            logger.error(f"Error in {message_type} method", extra={"error": str(e)})
            return None

    @tracer.wrap()
    def create(self, user_id: str, prompt: str, history: List[MessageParam] | None = None) -> str | None:
        return self.process_message(user_id, prompt, history, "create")

    @tracer.wrap()
    def update(self, user_id: str, prompt: str, history: List[MessageParam] | None = None) -> str | None:
        return self.process_message(user_id, prompt, history, "update")

    @tracer.wrap()
    def handle_tool_use(self, func_name: str, func_params: Dict[str, Any]) -> str:
        if func_name == "simulate_protocol":
            results = self.simulate_protocol(**func_params)
            return results

        logger.error("Unknown tool", extra={"tool": func_name})
        raise ValueError(f"Unknown tool: {func_name}")

    @tracer.wrap()
    def simulate_protocol(self, protocol: str) -> str:
        url = "https://Opentrons-simulator.hf.space/protocol"
        protocol_name = str(uuid.uuid4()) + ".py"
        data = {"name": protocol_name, "content": protocol}
        hf_token: str = settings.huggingface_api_key.get_secret_value()
        headers = {"Content-Type": "application/json", "Authorization": "Bearer {}".format(hf_token)}
        response = requests.post(url, json=data, headers=headers)

        if response.status_code != 200:
            logger.error("Simulation request failed", extra={"status": response.status_code, "error": response.text})
            return f"Error: {response.text}"

        response_data = response.json()
        if "error_message" in response_data:
            logger.error("Simulation error", extra={"error": response_data["error_message"]})
            return str(response_data["error_message"])
        elif "protocol_name" in response_data:
            return str(response_data["run_status"])
        else:
            logger.error("Unexpected response", extra={"response": response_data})
            return "Unexpected response"


def main() -> None:
    """Intended for testing this class locally."""
    import sys
    from pathlib import Path

    # # Add project root to Python path
    root_dir = Path(__file__).parent.parent.parent
    sys.path.insert(0, str(root_dir))

    from rich import print
    from rich.prompt import Prompt

    settings = Settings()
    llm = AnthropicPredict(settings)
    Prompt.ask("Type a prompt to send to the Anthropic API:")

    completion = llm.create(user_id="1", prompt="hi", history=None)
    print(completion)


if __name__ == "__main__":
    main()
