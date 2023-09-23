# earnaha

This is a NestJS application offering basic features like login, logout, dashboard, and user modification functionalities. It also supports Google OAuth2.

Based on the server's endpoint, in principle, the API can be operated through Swagger under /doc.

Before using, simply complete the earnaha/.env.template and .env.template. Then, you can get the service running using docker-compose up.


for product env, fill in the earnaha/.env.template and copy to earnaha/.env.product

kubectl create secret generic db-secret --from-literal=POSTGRES_USER=myuser --from-literal=POSTGRES_PASSWORD=mypassword
kubectl create secret generic pgadmin-secret --from-literal=PGADMIN_DEFAULT_EMAIL=myemail@example.com --from-literal=PGADMIN_DEFAULT_PASSWORD=adminpassword
kubectl create secret generic auth-app-secret --from-env-file=path_to_your/.env
kubectl create configmap nginx-config --from-file=./k8s/nginx/etc/nginx/nginx.conf
kubectl create secret generic nginx-ssl-secret --from-file=./k8s/nginx/etc/cert/fullchain.pem --from-file=./k8s/nginx/etc/cert/privkey.pem



build aha-backend:v1.0.0
docker save aha-backend:v1.0.0 > aha-backend.tar
microk8s ctr images import aha-backend.tar

