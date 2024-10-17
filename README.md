# timechimp-jira

## Getting started

[Jira Getting Started Guide](https://developer.atlassian.com/cloud/jira/platform/getting-started)

## Demo App

[Jira Demo App](https://bitbucket.org/atlassianlabs/atlassian-connect-whoslooking-connect-v2/src/0019f3786267?at=master)

## Test

```sh
http-server -p 8000
ngrok http 8000
```

Install add-on on atlassian: /atlassian-connect.json

## How to update the app

Before starting, make sure that you have access to the TimeChimp azure environment and any tool allowing you to access a FTP.
If you do not have any tool for that yet, you can use SCFTP client **WinSCP**.

Also make sure that you have access to the git repository. (Spoiler: if you are currently reading this, you do.)

To access the server follow these given steps:
- Go to the azure portal
- Access the timechimp-jira application
- Download the publish profile
- Open the given file with any text editor (notepad is fine for this purpose)
- Find the FTP configuration
- Open WinSCP, it will open a login dialog
- Fill in the informations (publish url as hostname, username as username and password as password). If you are a copy/paste master, you should be able to access it.

*If you are a copy/paste master, you should be able to access it.*

To publish your modifications follow these given steps:
- Pull the master branche of the repository locally
- Delete the folder called `Old`
- Create a new folder and name it `Old`
- Copy the files in `Old` folder. **This will be your backup if something goes wrong. Do not delete this folder unless you are publishing a new version.**
- Replace the files you modified with the files from the master branche you just pulled

*If you are a drag&drop master, you should have successfuly published your modifications.*