build:
	docker compose -f docker-compose.yml build

up:
	docker compose -f docker-compose.dev.yml up --remove-orphans

# only run worker server with cmd `npm run test`
test:
	docker compose -f docker-compose.dev.yml run --rm worker npm run test

up-prod:
	docker compose -f docker-compose.prod.yml up --build -d

down: 
	docker compose down
