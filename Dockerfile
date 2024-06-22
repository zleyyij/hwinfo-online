# builder base image
FROM alpine:3.20 as builder

# add required packages
RUN apk add --no-cache \
    build-base rustup
RUN rustup-init -y
RUN /root/.cargo/bin/cargo install wasm-pack

# create the app directory and copy in source
RUN mkdir -p /app
COPY src /app

# build the app
WORKDIR /app/scripts/parser/
RUN export PATH="$HOME/.cargo/bin:$PATH" ; \
    /root/.cargo/bin/wasm-pack build --target web

# runtime container
FROM nginx:stable-alpine3.19-slim as runtime

# add required runtime packages
RUN apk add --no-cache nginx

# copy in built files from builder
COPY --from=builder /app/ /usr/share/nginx/html
