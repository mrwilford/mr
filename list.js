import { assert } from './assert.js';

/** List */
export class List{
	_elem = undefined;//allow 'null' to be valid data but not 'undefined'
	_next = null;
	_prev = null;

	/** Create a new List.
	 * @constructor
	 * @param {...*} elements Data to make a list out of.
	 * @returns {List} New list of data.
	 */
	constructor(...elements){ this.insertAfter(...elements) }

	///Accessors
	get element(){ return this._elem }
	set element(v){ this._elem = v }
	get next(){ return this._next }
	get prev(){ return this._prev }

	///Calculated getters
	get head(){ return this._prev ? this._prev.head : this }
	get tail(){ return this._next ? this._next.tail : this }
	get length(){ return this._next ? 1+this._next.length : 1 }
	set length(n){ this.at(n+1).remove(this.length-n+1) }
	get array(){ return [ this._elem, ...(this._next ? this._next.array : []) ] }

	/** Get the sublist at a given index.
	 * @param {number} index The position in the list to fetch.
	 * Positive values index up and negative values index backwards from the tail.
	 * @returns {List} The sublist at the index position.
	 * @example ```
	 * const list = new List(1, 2, 3, 4);
	 * list.at(2);//3
	 * ```
	 * @example ```
	 * const list = new List(1, 2, 3, 4);
	 * list.at(-2);//3
	 * ```
	 */
	at(index){
		let node = index<0 ? this.tail : this;
		if(0<index) for(let i=+1; i<=index && node._next; ++i, node=node._next);
		if(index<0) for(let i=-2; index<=i && node._prev; --i, node=node._prev);
		return node;
	}//at

	/** Insert elements before this.
	 * @param {*} element Data to store preceeding this.
	 * @param {...*} [moreElements] Additional data to insert afterwards.
	 * @returns {List} This List.
	 * @example ```
	 * const list = new List(3, 4);
	 * list.insertBefore(1, 2);//List: 1 → 2 → 3 → 4
	 * list.array;//[1, 2, 3, 4]
	 * ```
	 */
	insertBefore(element, ...moreElements){
		if(undefined===element) return this;
		if(undefined===this._elem){
			assert(null===this._next && null===this._prev);
			this._elem = element;
			this.insertAfter(...moreElements);
			return this;
		}//if
		//create a new node and swap with this
		//because we want the caller's list reference
		//to point to the first new node
		const newNode = new List(this._elem);
		this._elem = element;
		if(this._next) this._next._prev = newNode;
		newNode._next = this._next;
		newNode._prev = this;
		this._next = newNode;
		this.insertAfter(...moreElements);
		return this;
	}//insertBefore

	/** Insert elements after this.
	 * @param {*} element Data to store following this.
	 * @param {...*} [moreElements] Additional data to insert afterwards.
	 * @returns {List} This List.
	 * @example ```
	 * const list = new List(1, 2);
	 * list.insertAfter(3, 4);//List: 1 → 2 → 3 → 4
	 * list.array;//[1, 2, 3, 4]
	 * ```
	 */
	insertAfter(element, ...moreElements){
		if(undefined===element) return this;
		if(undefined===this._elem){
			assert(null===this._next && null===this._prev);
			this._elem = element;
			this.insertAfter(...moreElements);
			return this;
		}//if
		//the caller's list reference does not need
		//to change so there's no need to swap
		//'this' with the new node
		const newNode = new List(element);
		newNode._next = this._next;
		newNode._prev = this;
		if(this._next) this._next._prev = newNode;
		this._next = newNode;
		newNode.insertAfter(...moreElements);
		return this;
	}//insertAfter

	/** Remove elements from the list starting with this one.
	 * @param {number} [count] The number of elements to remove (default:1).
	 * @returns {Array} Array of elements that were removed.
	 * @example ```
	 * const list = new List(1, 2, 3, 1, 2, 4);
	 * list.next.next.next.remove(2);//[1, 2]
	 * list.array;//[1, 2, 3, 4]
	 * ```
	 */
	remove(count = 1){
		const removed = this.array;
		removed.length = count;
		//actually can't 'delete' nodes in 'strict mode'
		//for(let i=0, node=this._next; node && i<=count; ++i, node=node._next) delete node;
		const lastRemoved = this.at(count-1);
		//swap this data with the first unremoved data
		//in order to preserve the caller's list reference
		this._elem = lastRemoved._next?._data;
		this._next = lastRemoved._next?._next;
		return removed;
	}//remove
}//ListNode

/** ListStack */
export class ListStack extends List{
	/** Push new elements onto the ListStack.
	 * @param {...*} elements New data to push.
	 * @returns {ListStack} This ListStack.
	 * @example ```
	 * const stack = new ListStack(3);
	 * stack.push(1, 2);//ListStack: 1 → 2 → 3
	 * stack.array;//[1, 2, 3]
	 * ```
	 */
	push(...elements){ return this.insertBefore(...elements) }

	/** Pop off elements from the ListStack.
	 * @param {number} [count] Number of elements to pop (default:1).
	 * @returns {Array} Array of elements that were popped off.
	 * @example ```
	 * const stack = new ListStack(0, 1, 2, 3);
	 * stack.pop(2);//[0, 1]
	 * stack.array;//[2, 3]
	 * ```
	 */
	pop(count){ return this.remove(count) }
}//ListStack

/** ListQueue */
export class ListQueue extends List{
	/** Enqueue new elements onto the ListQueue.
	 * @param {...*} elements New data to enqueue.
	 * @returns {ListQueue} This ListQueue.
	 * @example ```
	 * const q = new ListQueue(1);
	 * q.enqueue(2, 3);//ListQueue: 1 → 2 → 3
	 * q.array;//[1, 2, 3]
	 * ```
	 */
	enqueue(...elements){ return this.tail.insertAfter(...elements) }

	/** Dequeue elements from the ListQueue.
	 * @param {number} [count} Number of elements to dequeue (default:1).
	 * @returns {Array} Array of elements that were dequeued.
	 * @example ```
	 * const q = new ListQueue(0, 1, 2, 3);
	 * q.dequeue(2);//[0, 1]
	 * q.array;//[2, 3]
	 * ```
	 */
	dequeue(count){ return this.remove(count) }
}//ListQueue

///* EOF *///
