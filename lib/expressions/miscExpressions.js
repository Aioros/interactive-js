module.exports = [

  {
    type: "Literal",
    value: null,
    evaluate: async function() { return this.value; }
  },

  {
    type: "Identifier",
    name: null,
    evaluate: async function() {
      var identifier = this.Engine.Scope.findIdentifier(this.name);
      return identifier.value;
    }
  },

  {
    type: "SpreadElement",
    argument: null,
    evaluate: async function() {
      var result = [];
      var argument = await this.Engine.process(this.argument);
      for (let v of argument)
        result.push(v);
      return result;
    }
  },

  {
    type: ["ArrayExpression", "ArrayPattern"],
    elements: [],
    evaluate: async function() {
      var result = [];
      for (let el of this.elements) {
        result.push(await this.Engine.process(el));
      }
      return result;
    }
  },

  {
    type: ["ObjectExpression", "ObjectPattern"],
    properties: [],
    evaluate: async function() {
      var obj = {};
      for (let prop of this.properties) {
        obj[prop.key.name] = await this.Engine.process(prop.value);
      }
      return obj;
    }
  },
  
  {
    type: ["MemberExpression", "StaticMemberExpression"],
    evaluate: async function() {
      let mExpInfo = await this.Engine.findMemberExpression(this);
      return mExpInfo.getValue();
    }
  },
  
  {
    type: "FunctionExpression",
    evaluate: async function() {
      this.Engine.createFunctionContext(this);
      return this;
    }
  },
  
  {
    type: "SequenceExpression",
    evaluate: async function() {
      var result;
      for (var e=0; e<this.expressions.length; e++) {
        result = await this.Engine.process(this.expressions[e]);
      }
      return result;
    }
  }

];