# Ronin Advisory Group Website

This project folder contains the application layer, agentic layer, and documentation layer for the website for the operator's business, Ronin Advisory Group, LLC. 

## Project Structure

## Project Agentic Layer

## Requirements

- support for the use of both Pi and Claude Code harnesses
- Publishing to the web via Github Pages

## Project Initialization Process
- Prime the folder with environment info via /prime-env
- Use the /session-management skill to initialize the three way contract workflow. primatives created for this project will be prefixed with rag-web-* to avoid namespace collision. 
- Define the project spefic agentic primitives to be developed with the /agentic-engineering skill
- have the /documentation-layer skill invoked to create the documentation that the agentic layer will employ
- Generate the project specific agentic primitives ensuring they reference and read documentation files that already exist
- finalize preparation to begin substantive work by using the rag-web-close command which will be put together during the initialization of the session management workflow. 
