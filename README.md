


Interactive JS
=================
Interactive JS is a (**very**) simplified implementation of a JavaScript engine in JavaScript. It runs a script in a sandboxed environment, and allows users to register actions at any step.

It relies on [esprima](http://esprima.org/) for syntactic analysis, and then proceeds to step asynchronously through the Abstract Syntax Tree (AST), keeping track of executions contexts and scope chains.

Usage
------------

    const Engine = require("./engine.js");
    
    var script = `
    function foo(a=1) {
      console.log(a);
    }
    
    foo(2);
    `;
    var e = Object.create(Engine);
    e.addAction("CallExpression", function(e) {console.log("pre call: ", e.type);}, "before");
    e.addAction("CallExpression", function(e) {console.log("post call: ", e.type);}, "after");
    e.addAction(/.*/, function(n) {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          console.log(n.type);
          resolve();
        }, 50);
      });
    }, "before");
    
    e.run(script, {console})
      .then(() => {
        console.log("done");
      })
      .catch((e) => {
        console.error(e);
      })
Status and Features
------------
The project is still in early development. Most of the basic language constructs work, and the engine supports an event loop, promises, and generators; but many features are still missing, most notably:

 - `async`/`await`
 - Proxies
 - shims for common async API functions;

