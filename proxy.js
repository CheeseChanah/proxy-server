const cluster = require('cluster');
const http = require('http');
const fs = require('fs');
const numCPUs = require('os').cpus().length;
var url = require("url");

const host = '127.0.0.1';
const port = 3000;

function format_date(date) {
  return date < 10 ? "0" + date : date;
}

if (cluster.isPrimary) {
  for (var i = 0; i < numCPUs; ++i) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Процесс ${worker.process.pid} завершён`);
  });
} else {
  var server = http.createServer((req, res) => {
    var method = req.method;
    var ip = req.connection.remoteAddress;
    var url_info  = url.parse(req.url);
    var options = {
      host: url_info.host,
      port: url_info.port,
      method: method,
      path: url_info.path,
      headers: req.headers
    };
    
    var proxy_req = http.request(options);
    proxy_req.on('response', function(proxy_res) {
      proxy_res.on('data', function(chunk) {
        res.write(chunk, 'binary');
      });
      proxy_res.on('end', function() {
        res.end();
      });
      res.writeHead(proxy_res.statusCode, proxy_res.headers);
    });
    req.on('data', function(chunk) {
      proxy_req.write(chunk, 'binary');
    });
    req.on('end', function() {
      proxy_req.end();
    });
    
    // определение текущей даты, времени
    var date = new Date();
    var current_date = date.getFullYear() + '-' +
       format_date(date.getMonth() + 1) + '-' +
       format_date(date.getDate());
    var current_time = format_date(date.getHours()) + ':' +
       format_date(date.getMinutes()) + ':' +
       format_date(date.getSeconds());
       
    // сохранение всех данных в одну строку и сохранение её в файл
    var data = '[' + current_date + ' ' + current_time + '] ' + ip +
      ' ' + method + ' ' + req.url;
    fs.appendFile('log.txt', data + '\n', function(err) {
      if (err) {
        return console.log(err);
      } else {
        console.log(`${data} сохранено в файл`);
      }
    });
  });

  server.listen(port, host, () => {
    console.log('Запущен процесс: ' + process.pid);
  });

}
