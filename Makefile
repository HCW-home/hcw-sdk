
build: node_modules
	npx ng build hug-angular-lib --prod
	cd dist/hug-angular-lib/ && npm pack
	mv dist/hug-angular-lib/*.tgz ./

node_modules:
	npm install

test:
	npx ng test hug-angular-lib

lint:
	npx ng link hug-angular-lib

clean:
	rm -rf node_modules

version:
	@cat projects/hug-angular-lib/package.json | jq .version | sed 's/"//g'
