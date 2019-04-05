const ExpValue = require("../expValue.js");

module.exports = [

  {
    type: "Literal",
    value: null,
    evaluate: async function() {
      return ExpValue(this.value);
    }
  },

  {
    type: "Identifier",
    name: null,
    evaluate: async function() {
      var identifier = this.Engine.Scope.findIdentifier(this.name);
      return ExpValue(identifier.value);
    }
  },

  {
    type: "SpreadElement",
    argument: null,
    evaluate: async function() {
      var result = [];
      var argument = (await this.Engine.process(this.argument)).unwrap();
      for (let v of argument)
        result.push(v);
      return ExpValue(result);
    }
  },

  {
    type: ["ArrayExpression", "ArrayPattern"],
    elements: [],
    evaluate: async function() {
      var result = new this.Engine.globalObj.Array(0);
      for (let el of this.elements) {
        result.push((await this.Engine.process(el)).unwrap());
      }
      return ExpValue(result);
    }
  },

  {
    type: ["ObjectExpression", "ObjectPattern"],
    properties: [],
    evaluate: async function() {
      var obj = {};
      for (let prop of this.properties) {
        obj[prop.key.name] = (await this.Engine.process(prop.value)).unwrap();
      }
      return ExpValue(obj);
    }
  },
  
  {
    type: ["MemberExpression", "StaticMemberExpression"],
    evaluate: async function() {
      let mExpInfo = await this.Engine.findMemberExpression(this);
      return ExpValue(mExpInfo.getValue());
    }
  },
  
  {
    type: "SequenceExpression",
    evaluate: async function() {
      var result;
      for (var e=0; e<this.expressions.length; e++) {
        result = (await this.Engine.process(this.expressions[e])).unwrap();
      }
      return ExpValue(result);
    }
  },

  {
    type: "ThisExpression",
    evaluate: async function() {
      var thisIdentifier = this.Engine.Scope.findIdentifier("this");
      return ExpValue(thisIdentifier.value);
    }
  }

];