# https://www.nginx.com/blog/deploying-nginx-nginx-plus-docker/
FROM nginx
WORKDIR /usr/share/nginx/html
# web files
COPY ./target/ .
