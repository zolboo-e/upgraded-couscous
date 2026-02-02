#!/bin/bash

# Container server must use bun (Cloudflare's requirement)
exec bun /container-server/dist/index.js

