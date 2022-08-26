Object.defineProperties(Array.prototype, {
  /**
   * Array.prototype.split(fn)
   * Split this array into an array of arrays where the provided function 
   * determines which array each element belongs to.
   * 
   * @param {function(*, number, *[]):number} fn
   * Callback function that directs each element to one of the split arrays.
   * The first parameter is the array element.
   * The second parameter is the array element index.
   * The third parameter is the array itself.
   * The return value must be a non-negative integer indicating which array to use.
   * 
   * @example [ 1, 2, 3, 4, 5, 6 ].split(x => x % 2) //⇾ [ [ 2, 4, 6 ], [ 1, 3, 5 ] ] //evens then odds
   */
  split: {
    value: function (fn) {
      return this.reduce((split, value, i) => {
        const whichArray = fn(value, i, this);
        while(split.length<=whichArray) split.push([]);
        split[whichArray].push(value);
        return split;
      }, [])//reduce split
    },//value
  },//split
});//defineProperties Array.prototype
