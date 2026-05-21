FROM --platform=linux/amd64 node:26-alpine

WORKDIR /app

COPY ./dist/api /app/dist/api
COPY ./src/vendors /app/src/vendors

ENV TZ=Asia/Shanghai
ENV PORT=80
ENV HOST=0.0.0.0

EXPOSE 80

CMD ["node", "dist/api/calc-server.js"]
