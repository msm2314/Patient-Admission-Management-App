# WardDesk

WardDesk is a patient admission registry for the DScribe Software Engineer Intern Round 1 assignment. Staff can add, view, edit, discharge, and delete patient records. Name search and ward, department, and doctor filters can be combined. Deleting a record opens a confirmation dialog.

**Tech stack** — React 18, Vite, Java 21, Spring Boot, and MongoDB.

**Live demo** — Pending deployment.

## Run with Docker

With Docker and Docker Compose installed, run:

```sh
docker compose up --build
```

Open [localhost:8080](http://localhost:8080). Spring Boot serves both the React build and the API. MongoDB stores records in a named volume, which survives app and container restarts. Use `docker compose down` to stop the stack and retain that volume.

## Run for development

Install Java 21 or later, Maven 3.9+, Node.js 22.12+ and MongoDB. Start MongoDB locally on port 27017, or export `MONGODB_URI` with a database name in the connection string.

Run the backend in one terminal:

```sh
mvn spring-boot:run
```

Run the frontend in another terminal:

```sh
npm --prefix frontend install
npm --prefix frontend run dev
```

Open [localhost:5173](http://localhost:5173). Vite proxies API requests to port 8080.

## Deploy

Deploy the root Dockerfile to a Docker-capable web service and configure `MONGODB_URI` with a persistent MongoDB database. The app reads `PORT` from the host and defaults to 8080. Verify the public URL loads the patient registry and can create and retrieve a synthetic patient across a service restart. Use synthetic records on the public assignment demo.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/options` | Get allowed dropdown values |
| GET | `/api/patients` | List all patient records |
| POST | `/api/patients` | Add a patient |
| PUT | `/api/patients/{id}` | Edit a patient |
| PATCH | `/api/patients/{id}/discharge` | Mark a patient as discharged |
| DELETE | `/api/patients/{id}` | Delete a patient |

The frontend and API validate names, whole-number ages from 0 to 120, dropdown selections, and admission dates. Both use the India date for the future-date rule. Invalid writes return HTTP 400 with a message and field errors. Names accept Unicode letters and spaces between words.

## Architecture

Browser → React/Vite UI → Spring Boot REST API → MongoDB. The Docker build bundles the frontend and backend into one deployable Java service.

## Releases and packages

Current source version: **1.0.0** (Maven project version). A published GitHub release and container package are not yet available.

- [Releases](https://github.com/msm2314/Patient-Admission-Management-App/releases): versioned distribution archives and release notes.
- [Packages](https://github.com/msm2314/Patient-Admission-Management-App/packages): container images when published.
- [Source archive](./WardDesk-source.zip): existing project source bundle.

To build a local container image:

```sh
docker build -t warddesk:1.0.0 .
```

## Demo safety

This is an internship assignment prototype, not a production clinical system. Use fictional patient records only. Do not submit real patient information or credentials to the public demo. Production use would require authentication, authorization, audit logging and a security/privacy review.
