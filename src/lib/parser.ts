import { Token, TokenType, Diagnostic, RuleCall, Expr, SourceLocation, ListExpr, StringLiteral, LabelExpr } from '../types';

export class Lexer {
  private source: string;
  private filepath: string;
  private cursor = 0;
  private line = 1;
  private col = 1;

  constructor(source: string, filepath: string) {
    this.source = source;
    this.filepath = filepath;
  }

  private peek(): string {
    if (this.cursor >= this.source.length) return '\0';
    return this.source[this.cursor];
  }

  private get(): string {
    if (this.cursor >= this.source.length) return '\0';
    const c = this.source[this.cursor++];
    if (c === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return c;
  }

  private skipWhitespaceAndComments() {
    while (this.cursor < this.source.length) {
      const c = this.peek();
      if (/\s/.test(c)) {
        this.get();
      } else if (c === '#') {
        while (this.cursor < this.source.length && this.peek() !== '\n') {
          this.get();
        }
      } else {
        break;
      }
    }
  }

  private lexString(): Token {
    const loc: SourceLocation = { path: this.filepath, line: this.line, col: this.col };
    const quote = this.get(); // ' or "
    let value = '';
    while (this.cursor < this.source.length && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.get(); // escape char
        if (this.cursor < this.source.length) {
          value += this.get();
        }
      } else {
        value += this.get();
      }
    }
    if (this.peek() === quote) {
      this.get(); // consume close quote
    }
    return { type: 'String', lexeme: value, location: loc };
  }

  private lexIdent(): Token {
    const loc: SourceLocation = { path: this.filepath, line: this.line, col: this.col };
    let value = '';
    while (this.cursor < this.source.length) {
      const c = this.peek();
      if (/[a-zA-Z0-9_]/.test(c)) {
        value += this.get();
      } else {
        break;
      }
    }
    return { type: 'Ident', lexeme: value, location: loc };
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    while (true) {
      this.skipWhitespaceAndComments();
      const c = this.peek();
      if (c === '\0') {
        tokens.push({ type: 'Eof', lexeme: '', location: { path: this.filepath, line: this.line, col: this.col } });
        break;
      }
      const loc: SourceLocation = { path: this.filepath, line: this.line, col: this.col };
      if (c === '(') {
        this.get();
        tokens.push({ type: 'LPar', lexeme: '(', location: loc });
      } else if (c === ')') {
        this.get();
        tokens.push({ type: 'RPar', lexeme: ')', location: loc });
      } else if (c === '[') {
        this.get();
        tokens.push({ type: 'LBracket', lexeme: '[', location: loc });
      } else if (c === ']') {
        this.get();
        tokens.push({ type: 'RBracket', lexeme: ']', location: loc });
      } else if (c === '=') {
        this.get();
        tokens.push({ type: 'Equal', lexeme: '=', location: loc });
      } else if (c === ',') {
        this.get();
        tokens.push({ type: 'Comma', lexeme: ',', location: loc });
      } else if (c === '"' || c === "'") {
        tokens.push(this.lexString());
      } else if (/[a-zA-Z_]/.test(c)) {
        tokens.push(this.lexIdent());
      } else {
        this.get();
        tokens.push({ type: 'Unknown', lexeme: c, location: loc });
      }
    }
    return tokens;
  }
}

export class Parser {
  private tokens: Token[];
  private cursor = 0;
  private diagnostics: Diagnostic[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    if (this.cursor >= this.tokens.length) return this.tokens[this.tokens.length - 1];
    return this.tokens[this.cursor];
  }

  private previous(): Token {
    if (this.cursor === 0) return this.tokens[0];
    return this.tokens[this.cursor - 1];
  }

  private advance(): Token {
    if (this.cursor < this.tokens.length) {
      this.cursor++;
    }
    return this.previous();
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private consume(type: TokenType, errorMessage: string): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    this.diagnostics.push({
      severity: 'Error',
      message: errorMessage,
      location: this.peek().location,
      hint: `Expected token of type ${type}`
    });
    return false;
  }

  private isLabel(str: string): boolean {
    return (str.startsWith('//') && str.includes(':')) || str.startsWith(':');
  }

  public parse(): { rules: RuleCall[]; diagnostics: Diagnostic[] } {
    const rules: RuleCall[] = [];
    while (!this.check('Eof')) {
      try {
        const rule = this.ruleCall();
        if (rule) {
          rules.push(rule);
        } else {
          this.synchronize();
        }
      } catch (e) {
        this.synchronize();
      }
    }
    return { rules, diagnostics: this.diagnostics };
  }

  private synchronize() {
    this.advance();
    while (!this.check('Eof')) {
      if (this.previous().type === 'RPar') return;
      if (this.check('Ident')) return;
      this.advance();
    }
  }

  private ruleCall(): RuleCall | null {
    if (!this.check('Ident')) {
      this.diagnostics.push({
        severity: 'Error',
        message: 'Expected rule call name (e.g. cc_binary, cc_library)',
        location: this.peek().location,
        hint: 'Start your target definitions with standard rules'
      });
      return null;
    }

    const ruleTok = this.advance();
    const ruleType = ruleTok.lexeme;
    const ruleLoc = ruleTok.location;

    if (!this.consume('LPar', "Expected '(' after rule type name")) {
      return null;
    }

    const args: Record<string, Expr> = {};
    let name = '';

    while (!this.check('RPar') && !this.check('Eof')) {
      const arg = this.namedArg();
      if (!arg) return null;
      args[arg.name] = arg.value;
      if (arg.name === 'name' && arg.value.type === 'StringLiteral') {
        name = arg.value.value;
      }

      if (!this.match('Comma')) {
        if (!this.check('RPar')) {
          this.diagnostics.push({
            severity: 'Error',
            message: "Expected ',' or ')' inside named arguments list",
            location: this.peek().location,
            hint: 'Attributes within rules must be separated by commas'
          });
          return null;
        }
      }
    }

    if (!this.consume('RPar', "Expected ')' to close rule arguments")) {
      return null;
    }

    return {
      ruleType,
      name,
      args,
      location: ruleLoc
    };
  }

  private namedArg(): { name: string; value: Expr } | null {
    if (!this.check('Ident')) {
      this.diagnostics.push({
        severity: 'Error',
        message: 'Expected attribute parameter key identifier (e.g. name, srcs, deps)',
        location: this.peek().location,
        hint: 'Input key must be standard identifier'
      });
      return null;
    }

    const keyTok = this.advance();
    if (!this.consume('Equal', "Expected '=' after attribute key name")) {
      return null;
    }

    const val = this.expr();
    if (!val) return null;

    return { name: keyTok.lexeme, value: val };
  }

  private expr(): Expr | null {
    const loc = this.peek().location;
    if (this.match('String')) {
      const s = this.previous().lexeme;
      if (this.isLabel(s)) {
        return { type: 'LabelExpr', value: s, location: loc };
      } else {
        return { type: 'StringLiteral', value: s, location: loc };
      }
    } else if (this.check('LBracket')) {
      return this.listExpr();
    }

    this.diagnostics.push({
      severity: 'Error',
      message: 'Expected string literal or list bracket',
      location: loc,
      hint: 'Define lists with square brackets [] or strings with double quotes'
    });
    return null;
  }

  private listExpr(): ListExpr | null {
    const loc = this.peek().location;
    this.advance(); // consume LBracket

    const elements: (StringLiteral | LabelExpr)[] = [];
    while (!this.check('RBracket') && !this.check('Eof')) {
      const elementRes = this.expr();
      if (!elementRes) return null;

      if (elementRes.type === 'ListExpr') {
        this.diagnostics.push({
          severity: 'Error',
          message: 'Nested lists are not allowed in simple BUILD files',
          location: this.peek().location,
          hint: 'Keep array values inside flat string lists'
        });
        return null;
      }

      elements.push(elementRes);

      if (!this.match('Comma')) {
        if (!this.check('RBracket')) {
          this.diagnostics.push({
            severity: 'Error',
            message: "Expected ',' or ']' after list item",
            location: this.peek().location,
            hint: 'List elements must have comma separators'
          });
          return null;
        }
      }
    }

    if (!this.consume('RBracket', "Expected ']' at the end of list element")) {
      return null;
    }

    return {
      type: 'ListExpr',
      elements,
      location: loc
    };
  }
}
