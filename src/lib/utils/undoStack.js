export class UndoStack {
  constructor(maxSize = 20) {
    this.stack = [];
    this.maxSize = maxSize;
    this.pointer = -1;
  }

  push(state) {
    if (this.pointer < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.pointer + 1);
    }
    this.stack.push(JSON.parse(JSON.stringify(state)));
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.pointer++;
    }
  }

  undo() {
    if (this.pointer > 0) {
      this.pointer--;
      return JSON.parse(JSON.stringify(this.stack[this.pointer]));
    }
    return null;
  }

  redo() {
    if (this.pointer < this.stack.length - 1) {
      this.pointer++;
      return JSON.parse(JSON.stringify(this.stack[this.pointer]));
    }
    return null;
  }

  get canUndo() {
    return this.pointer > 0;
  }

  get canRedo() {
    return this.pointer < this.stack.length - 1;
  }

  get current() {
    return this.pointer >= 0 ? this.stack[this.pointer] : null;
  }

  clear() {
    this.stack = [];
    this.pointer = -1;
  }
}

export function createUndoStack(maxSize) {
  return new UndoStack(maxSize);
}
