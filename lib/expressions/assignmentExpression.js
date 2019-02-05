module.exports = {
  type: ["AssignmentExpression", "AssignmentPattern"],
  evaluate: async function() {
    try {
      let right;
      if (this.operator == "=") {
        right = await this.Engine.process(this.right, true);
        if (this.left.type == "Identifier") {
          let identifier = this.Engine.Scope.findIdentifier(this.left.name);
          identifier.value = right;
        } else if (this.left.type == "MemberExpression") {
          let mExpInfo = await this.Engine.findMemberExpression(this.left);
          mExpInfo.obj[mExpInfo.prop] = right;
        } else if (this.left.type == "AssignmentPattern") {
          // evaluate that assignment first
          await this.Engine.process({
            type: "AssignmentExpression",
            operator: "=",
            right: this.left.right,
            left: this.left.left
          });
          // then evaluate our assignment on the target of that one
          await this.Engine.process(Object.assign({}, this, {left: this.left.left}));
        } else if (this.left.type == "ArrayPattern") {
          let targets = this.left.elements;
          let i=0;
          for (let v of right) {
            if (i < targets.length && targets[i] !== null) {
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
              await this.Engine.process(transExp);
            }
            i++;
          }
          // in case this is a parameter assignment and we have default values
          if (i<targets.length) {
            while (i<targets.length) {
              if (targets[i].type == "AssignmentPattern")
                await this.Engine.process(Object.assign(targets[i], {operator: "="}));
              i++;
            }
          }
        } else if (this.left.type == "ObjectPattern") {
          for (let prop of this.left.properties) {
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
            await this.Engine.process(transExp);
          }
        }
      } else { // operators like '+=', '*=', etc.
        return await this.Engine.process({
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
          var right = await this.Engine.process(this.right);
        this.callStack[0].define(this.left.name, "var", right);
        return right;
      } else {
        throw e;
      }
    }
  }
};