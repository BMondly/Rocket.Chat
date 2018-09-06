#!/bin/bash
set -x
set -euvo pipefail
IFS=$'\n\t'

CURL_URL="https://rocket.chat/releases/update"

curl -X POST "$CURL_URL"

/* saved as CRLF in RC-develop GitHub Repo */
