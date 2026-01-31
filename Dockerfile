FROM denoland/deno:alpine-1.46.3

WORKDIR /app
COPY . .
EXPOSE 8080

CMD ["run", "--allow-net", "--allow-env", "main.ts"]
