module.exports = {
  type: "AssignmentExpression",
  evaluate: function() {
    try {
      let right;
      if (this.operator == "=") {
        right = this.Engine.process(this.right, true);
        if (this.left.type == "Identifier") {
          let identifier = this.Engine.Scope.findIdentifier(this.left.name);
          identifier.value = right;
        } else if (this.left.type == "MemberExpression") {
          let mExpInfo = this.Engine.findMemberExpression(this.left);
          mExpInfo.obj[mExpInfo.prop] = right;
        } else if (this.left.type == "AssignmentPattern") {
          // evaluate that assignment first
          this.Engine.process({
            type: "AssignmentExpression",
            operator: "=",
            right: this.left.right,
            left: this.left.left
          });
          // then evaluate our assignment on the target of that one
          this.Engine.process(Object.assign({}, this, {left: this.left.left}));
        } else if (this.left.type == "ArrayPattern") {
          let targets = this.left.elements;
          let i=0;
          for (let v of right) {
            if (targets[i] !== null) {
              let transExp = {
                type: "AssignmentExpression",
                operator: "=",
                right: {
                  type: "MemberExpression",
                  computed: true,
                  object: this.right,
                  property: {type: "Literal", value: i}
                },
                left: targets[i]
              };
              this.Engine.process(transExp);
            }
            i++;
          }
        } else if (this.left.type == "ObjectPattern") {
          this.left.properties.forEach(prop => {
            let transExp = {
              type: "AssignmentExpression",
              operator: "=",
              right: {
                type: "MemberExpression",
                object: this.right,
                property: {type: "Identifier", name: prop.key.name}
              },
              left: prop.value
            };
            this.Engine.process(transExp);
          });
        }
      } else { // operators like '+=', '*=', etc.
        return this.Engine.process({
          type: "AssignmentExpression",
          operator: "=",
          left: this.left,
          right: {
            type: "BinaryExpression",
            operator: this.operator[0],
            left: this.left,
            right: this.right
          }
        });
      }
      return right;
    } catch (e) {
      if (e instanceof ReferenceError && !this.useStrict) {
        if (!right)
          var right = this.Engine.process(this.right);
        this.callStack[0].define(this.left.name, "var", right);
        return right;
      } else {
        throw e;
      }
    }
  }
};