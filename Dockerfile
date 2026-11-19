# 中原順起來 — static site served by nginx
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY vendor /usr/share/nginx/html/vendor
COPY data /usr/share/nginx/html/data
COPY assets /usr/share/nginx/html/assets
EXPOSE 80
