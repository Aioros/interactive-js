module.exports = [

  {
    type: "Literal",
    value: null,
    evaluate: function() { return this.value; }
  },

  {
    type: "Identifier",
    name: null,
    evaluate: function() {
      var identifier = this.Engine.Scope.findIdentifier(this.name);
      return identifier.value;
    }
  },

  {
    type: "SpreadElement",
    argument: null,
    evaluate: function() {
      var result = [];
      var argument = this.Engine.process(this.argument);
      for (let v of argument)
        result.push(v);
      return result;
    }
  },

  {
    type: ["ArrayExpression", "ArrayPattern"],
    elements: [],
    evaluate: function() {
      return this.elements.map(a => { return this.Engine.process(a); });
    }
  },

  {
    type: ["ObjectExpression", "ObjectPattern"],
    properties: [],
    evaluate: function() {
      return this.properties.reduce((obj, prop) => {
        obj[prop.key.name] = this.Engine.process(prop.value);
        return obj;
      }, {});
    }
  },
  
  {
    type: ["MemberExpression", "StaticMemberExpression"],
    evaluate: function() {
      let mExpInfo = this.Engine.findMemberExpression(this);
      return mExpInfo.getValue();
    }
  },
  
  {
    type: "FunctionExpression",
    evaluate: function() {
      return this;
    }
  },
  
  {
    type: "SequenceExpression",
    evaluate: function() {
      var result;
      for (var e=0; e<this.expressions.length; e++) {
        result = this.Engine.process(this.expressions[e]);
      }
      return result;
    }
  }

];