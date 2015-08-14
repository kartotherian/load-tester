var preq = require('preq');
var argv = require('minimist')(process.argv.slice(2));
var locations = require('./locations');
var TimingBuffer = require('./timing-buffer');
var _ = require('underscore');

console.log(argv);

var server = 'http://ns512621.ip-167-114-156.net/s2/';
var format = '.png';
var users = 10;
var screenSizes = [5, 5];
var zoomLimits = { min: 12, max: 12 };
var requests = new TimingBuffer(200);

function lon2tile(lon, zoom) {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}
function lat2tile(lat, zoom) {
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
}

function userThread(id) {
    var queue = [];
    var zoom = 12;
    var pos = { x: 0, y: 0 };

    function pickRandomLocation() {
        var sum = 0;
        _.each(locations, function(value) { sum += value.weight; });
        var random = Math.random() * sum;

        sum = 0;
        for (var i = 0; i < locations.length; i++) {
            var loc = locations[i];
            sum += loc.weight;
            if (sum >= random) {
                break;
            }
        }
        console.log('User ' + id + ' goes to ' + loc.name);
        pos.x = lat2tile(loc.lat, zoom);
        pos.y = lon2tile(loc.lon, zoom);
        zoom = 12;
        queue = [];
        for (var x = 0; x < screenSizes[0]; x++) {
            for (var y = 0; y < screenSizes[1]; y++) {
                queue.push( { x: pos.x + x, y: pos.y + y } );
            }
        }
    }

    function updatePos() {
        var fromX, toX, fromY, toY, random = Math.random();

        if (Math.random() > 0.99) {
            pickRandomLocation();
            return;
        }

        if (random < 0.25) {
            pos.x--;
            fromX = toX = pos.x;
            fromY = pos.y;
            toY = fromY + screenSizes[1] - 1;
        } else if (random < 0.50) {
            pos.x++;
            fromX = toX = pos.x + screenSizes[0] - 1;
            fromY = pos.y;
            toY = fromY + screenSizes[1] - 1;
        } else if (random < 0.75) {
            pos.y--;
            fromY = toY = pos.y;
            fromX = pos.x;
            toX = fromX + screenSizes[0] - 1;
        } else {
            pos.y++;
            fromY = toY = pos.y + screenSizes[1] - 1;
            fromX = pos.x;
            toX = fromX + screenSizes[0] - 1;
        }

        for (var x = fromX; x <= toX; x++) {
            for (var y = fromY; y <= toY; y++) {
                queue.push( { x: x, y: y } );
            }
        }
    }

    function worker() {
        if (queue.length > 0) {
            var start = Date.now(),
                tile = queue.shift(),
                url = server + zoom + '/' + tile.x + '/' + tile.y + format;

            preq.get( { uri: url } )
                .then(function() {
                    requests.add(Date.now() - start);
                    worker();
                })
                .catch(function(err) {
                    console.log(url + ' failed: ' + err);
                    worker();
                });
        } else {
            setTimeout(worker, 100);
        }
    }

    pickRandomLocation();

    for (var i = 0; i < 6; i++) {
        worker();
    }

    setInterval(updatePos, 300);
}

for (var i = 0; i < users; i++) {
    userThread(i);
}

setInterval(function() {
        console.log('Requests per second: ' + requests.perSecond() + ' avg latency: ' + requests.averageTime());
    },
    1000
);
