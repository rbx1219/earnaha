# earnaha

This is a NestJS application offering basic features like login, logout, dashboard, and user modification functionalities. It also supports Google OAuth2.

Based on the server's endpoint, in principle, the API can be operated through Swagger under /doc.

Before using, simply complete the earnaha/.env.template and .env.template. Then, you can get the service running using docker-compose up.


for product env, fill in the earnaha/.env.template and copy to earnaha/.env.product



build aha-backend:v1.0.0
docker save aha-backend:v1.0.0 > aha-backend.tar
microk8s ctr images import aha-backend.tar

