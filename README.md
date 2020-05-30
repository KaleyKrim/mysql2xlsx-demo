# mysql2xlsx-demo

- A demo script that reads data from a MySQL database & writes to .xlsx file
- Files will be generated in the `./output` directory. The folder already contains a sample file created with this script.

## Usage

#### Initialize MySQL database (SQL files inside `./files/mysql-dump/` will be automatically loaded)
```
docker-compose up -d
```

#### Install dependencies
```
npm i
```

#### Create .xlsx file for default client_id (1240)
```
node index.js
```

#### Create .xlsx file for specified client
```
node index.js ${clientId}
```

## To do:
- Fix column width in xlsx file (I reached my time limit before I could do so, and they are very narrow.)
- Allow specified output path
