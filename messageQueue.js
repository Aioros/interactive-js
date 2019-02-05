const MessageQueue = {
  pending: {},
  messages: [],
  add: function(message) {
    this.messages.push(message);
  },
  addToPending: function(task) {
    this.pending[task.id] = task;
  },
  waitForMessage: function() {
    if (this.messages.length > 0)
      return true;
    if (Object.keys(this.pending).length == 0)
      return false;
    return true;
  },
  processNextMessage: async function() {
    if (this.messages.length > 0) {
      var message = this.messages.pop();
      await message.call();
    }
  },
  runEventLoop: async function() {
    var _this = this;
    if (this.waitForMessage()) {
      return this.processNextMessage()
        .then(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              _this.runEventLoop()
                .then(resolve);
            }, 0);
          });
        });
    }
  }
}

module.exports = MessageQueue;