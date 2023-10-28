# https://www.nginx.com/blog/deploying-nginx-nginx-plus-docker/
FROM nginx
WORKDIR /usr/share/nginx/html
# web files
COPY index.html .
COPY styles/ styles/
COPY assets/ assets/
COPY scripts/*.js scripts/
COPY scripts/hwgv-parser/pkg/* scripts/hwgv-parser/pkg/
COPY node_modules/ node_modules/
