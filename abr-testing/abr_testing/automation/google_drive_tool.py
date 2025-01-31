"""Google Drive Tool."""
import os
import io
import json
import sys
from typing import Set, Any, Optional, List, Dict
import webbrowser
import mimetypes
from oauth2client.service_account import ServiceAccountCredentials  # type: ignore[import]
import googleapiclient  # type: ignore[import]
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.http import MediaIoBaseDownload

"""Google Drive Tool.

This module requires a credentials.json file before getting started.
Retrieve from https://console.cloud.google.com/apis/credentials."""


class google_drive:
    """Google Drive Tool."""

    def __init__(self, credentials: Any, folder_name: str, email: str) -> None:
        """Connects to google drive via credentials file."""
        try:
            self.scope = ["https://www.googleapis.com/auth/drive"]
            self.credentials = ServiceAccountCredentials.from_json_keyfile_name(
                credentials, self.scope
            )
            self.drive_service = build("drive", "v3", credentials=self.credentials)
            self.parent_folder = folder_name
            self.email = email
        except json.decoder.JSONDecodeError:
            print("Error! Get file: https://console.cloud.google.com/apis/credentials")
            sys.exit()

    def list_folder(self, delete: Any = False, folder: bool = False) -> Set[str]:
        """List folders and files in Google Drive."""
        file_names = set()
        page_token: str = ""
        basic_query = f"'{self.parent_folder}' in parents and trashed=false"
        folder_query = (
            basic_query + " and mimeType='application/vnd.google-apps.folder'"
        )
        if folder is True:
            query = folder_query
        else:
            query = basic_query
        while True:
            results = (
                self.drive_service.files()
                .list(
                    q=query
                    if self.parent_folder
                    else ""  # type: ignore
                    if self.parent_folder
                    else None,
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True,
                    pageSize=1000,
                    fields="nextPageToken, files(id, name, mimeType)",
                    pageToken=page_token,
                )
                .execute()
            )
            items = results.get("files", [])
            if not items:
                break
            for item in items:
                item_name = item["name"]
                if delete:
                    self.delete_files(item["id"])
                file_names.add(item_name)
            page_token = results.get("nextPageToken", "")
            if len(page_token) < 1:
                break
            if not file_names:
                print("No folders or files found in Google Drive.")
        return file_names

    def create_folder(self, new_folder_name: str) -> str:
        """Create folder within defined folder."""
        file_metadata = {
            "name": new_folder_name,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [self.parent_folder],
        }
        list_of_current_folders = self.list_folder(folder=True)
        if new_folder_name in list_of_current_folders:
            print("Folder name already exists. Try new folder name or delete folder.")
            return ""
        else:
            file = (
                self.drive_service.files()
                .create(body=file_metadata, fields="id")  # type: ignore
                .execute()
            )
            folder_id = file.get("id", "")
            self.share_permissions(folder_id)
            # SHARE FOLDER WITH EMAIL
            print(f'Folder ID: "{file.get("id")}".')
            return file.get("id", "")

    def delete_files(self, file_or_folder_id: str) -> None:
        """Delete a file or folder in Google Drive by ID."""
        try:
            self.drive_service.files().delete(fileId=file_or_folder_id).execute()
            print(f"Successfully deleted file/folder with ID: {file_or_folder_id}")
        except Exception as e:
            print(f"Error deleting file/folder with ID: {file_or_folder_id}")
            print(f"Error details: {str(e)}")

    def upload_file(self, file_path: str, folder_name: str) -> str:
        """Upload file to Google Drive."""
        file_metadata = {
            "name": os.path.basename(file_path),
            "mimeType": str(mimetypes.guess_type(file_path)[0]),
            "parents": [folder_name],
        }
        media = MediaFileUpload(file_path, resumable=True)

        uploaded_file = (
            self.drive_service.files()
            .create(body=file_metadata, media_body=media, fields="id")  # type: ignore
            .execute()
        )
        uploaded_file_id = uploaded_file["id"]
        try:
            self.share_permissions(uploaded_file_id)
        except googleapiclient.errors.HttpError:
            print(f"File '{uploaded_file_id}' was not found after uploading.")
        return uploaded_file_id

    def upload_missing_files(self, storage_directory: str) -> None:
        """Upload missing files to Google Drive."""
        # Read .json files.
        google_drive_files = self.list_folder()
        google_drive_files_json = [
            file for file in google_drive_files if file.endswith(".json")
        ]
        # Read local directory.
        local_files_json = set(
            file for file in os.listdir(storage_directory) if file.endswith(".json")
        )
        missing_files = local_files_json - set(google_drive_files_json)
        # Upload missing files.
        uploaded_files = []
        for file in missing_files:
            file_path = os.path.join(storage_directory, file)
            uploaded_file_id = self.upload_file(file_path, self.parent_folder)
            uploaded_files.append(
                {"name": os.path.basename(file_path), "id": uploaded_file_id}
            )
            try:
                self.share_permissions(uploaded_file_id)
            except googleapiclient.errors.HttpError:
                continue

        # Fetch the updated file list after all are uploaded
        files = google_drive.list_folder(self)

        file_names = [file for file in files]
        for uploaded_file in uploaded_files:
            this_name = uploaded_file["name"]
            if this_name in file_names:
                print(
                    f"File '{this_name}' was successfully uploaded with ID: {uploaded_file['id']}"
                )
            else:
                print(f"File '{this_name}' was not found after uploading.")
        print(f"{len(files)} item(s) in Google Drive")

    def open_folder(self) -> Optional[str]:
        """Open folder in web browser."""
        folder_metadata = (
            self.drive_service.files()
            .get(fileId=self.parent_folder, fields="webViewLink")
            .execute()
        )
        folder_link = folder_metadata.get("webViewLink")
        if folder_link:
            print(f"Folder link: {folder_link}")
            webbrowser.open(
                folder_link
            )  # Open the folder link in the default web browser
        else:
            print("Folder link not found.")
        return folder_link

    def share_permissions(self, file_id: str) -> None:
        """Share permissions with self."""
        new_permission = {
            "type": "user",
            "role": "writer",
            "emailAddress": self.email,
        }
        self.drive_service.permissions().create(
            fileId=file_id, body=new_permission, transferOwnership=False  # type: ignore
        ).execute()

    def download_single_file(
        self, save_directory: str, file_id: str, file_name: str, mime_type: str
    ) -> str:
        """Download single file."""
        # google sheets: text/csv
        file_path = ""
        if mime_type:
            request = self.drive_service.files().export_media(
                fileId=file_id, mimeType=mime_type
            )
        else:
            request = self.drive_service.files().get_media(fileId=file_id)
        file_path = os.path.join(save_directory, file_name)
        fh = io.FileIO(file_path, "wb")
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            print(f"Downloading {file_name}... {int(status.progress() * 100)}%")
        return file_path

    def download_files(
        self, files_to_download: List[Dict[str, Any]], save_directory: str
    ) -> None:
        """Download files to a specified directory."""
        for file in files_to_download:
            id = file["id"]
            file_name = file["name"]
            file_path = os.path.join(save_directory, file_name)
            request = self.drive_service.files().get_media(fileId=id)  # type: ignore[attr-defined]
            fh = io.FileIO(file_path, "wb")
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while done is False:
                status, done = downloader.next_chunk()
                print(f"Downloading {file_name}... {int(status.progress() * 100)}%")

    def search_folder(self, search_strings: List[str], folder_id: str) -> List[Any]:
        """Search folder for files containing string from list."""
        files_found = []
        for search_string in search_strings:
            query = f"'{folder_id}' in parents and name contains '{search_string}'"
            response = (
                self.drive_service.files()
                .list(q=query, fields="files(id,name)")
                .execute()
            )
            files_found.extend(response.get("files", []))
        return files_found
