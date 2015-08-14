
function TimingBuffer(size) {
    this.buffer = [];
    this.size = size;
    this.sum = 0;
}

TimingBuffer.prototype.add = function(duration) {
    while (this.buffer.length >= this.size) {
        var shifted = this.buffer.shift();
        this.sum -= shifted.duration;
    }
    this.sum += duration;
    this.buffer.push( { duration: duration, ts: Date.now() } );
}

TimingBuffer.prototype.perSecond = function() {
    if (this.buffer.length < 2) {
        return 0;
    }
    var first = this.buffer[0], last = this.buffer[this.buffer.length - 1];
    if (first.ts == last.ts) {
        return 0;
    }
    return this.buffer.length * 1000.0 / (last.ts - first.ts);
}

TimingBuffer.prototype.averageTime = function() {
    if (!this.buffer.length) {
        return 0;
    }
    return this.sum / this.buffer.length;
}

module.exports = TimingBuffer;
