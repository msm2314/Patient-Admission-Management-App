FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app
COPY pom.xml ./
COPY src/ src/
COPY --from=frontend /app/target/classes/static/ target/classes/static/
RUN mvn -B package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend /app/target/patient-admissions-1.0.0.jar app.jar
USER 10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
