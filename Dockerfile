# syntax=docker/dockerfile:1
# Production image: build the jar (React dashboard included) with the Maven
# wrapper, then run it on a JRE as a non-root user. See deploy/README.md.

FROM eclipse-temurin:25-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY frontend frontend
COPY src src
# Tests run before merging (backend, front end); the server only packages.
# frontend-maven-plugin downloads Node and runs `npm ci` + `npm run build`.
RUN --mount=type=cache,target=/root/.m2 \
    --mount=type=cache,target=/root/.npm \
    ./mvnw -B -q -DskipTests package \
 && cp target/dashboard-*.jar /src/app.jar

FROM eclipse-temurin:25-jre
RUN useradd --system --uid 10001 --home-dir /app --shell /usr/sbin/nologin mos \
 && mkdir -p /app/uploads \
 && chown 10001:10001 /app/uploads
WORKDIR /app
COPY --from=build /src/app.jar /app/app.jar
USER 10001
EXPOSE 8080
# Uploaded product pictures live in /app/uploads (mos.upload-dir=uploads, relative to /app).
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
