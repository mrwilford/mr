// Javascript code always executes a file from top to 
// bottom, left-to-right. Let's pretend we are a JS
// "compiler" and are interpreting this file. We will 
// add comments as we go down this file to explain exactly 
// what it is that the compiler "sees". Please read the 
// comments in numerical order below.

function union(arrays){
// 1) A function is getting created and it is named "union".
// Everything inside the curly braces {} is the scope of 
// the union function. None of it gets executed yet. In 
// fact, the compiler doesn't even care what is inside 
// this function at this point in time. There could be 
// errors in there but the compiler doesn't care. All 
// that matters is a function is being created and it can 
// be referenced by the name "union". Now we skip over it.
// Please find (2) after the scope of the union function.

// 4) Okay, now we care about what is inside of the union 
// function because it has been invoked below, with a 
// single parameter which is an array that contains 
// three other arrays.

  function reduction(acc, arr){
  // 5) The first line we see in the union function is 
  // this declaration of a new function called "reduction".
  // Like before, we don't care about this yet, so we skip 
  // ahead to (6) after the scope of "reduction".
  
  // 7) Okay, now we care about what "reduction" does 
  // because it is being invoked by the reduce built-in
  // function below. But this time things are a little 
  // different because we aren't invoking "reduction" 
  // with parenthesis "()" anywhere. We don't invoke 
  // it ourselves at all! Instead, it is a callback
  // that was passed into "arrays.reduce" below as a 
  // parameter. And then, the reduce built-in function, 
  // which we didn't write and can't see, invokes the
  // "reduction" callback function three times because 
  // "arrays" has three elements.
  
    arr.forEach(n => {
    // 8) The "reduction" function is being executed! 
    // This is one of the three times that we know it 
    // will be executed. The first time we are executed,
    // "acc" will be an empty array literal "[]" and "arr"
    // will be "array1" as we can see from (3) below.
    // Here we see "arr" followed by the dot "." which 
    // opens up the object for us to access its properties.
    // The property we are accessing here is called "forEach"
    // which is another built-in function. Unlike "reduce",
    // "forEach" only takes one parameter: a callback 
    // function to be invoked once for every element.
    // Next we see an open parenthesis "(" which means 
    // we are invoking "forEach" right now. Next we see 
    // an arrow function "n =>" which declares a new 
    // anonymous function. This new anonymous function 
    // is not being executed right at this moment, we 
    // are just declaring it and passing it into 
    // "forEach" which IS being invoked so we know 
    // this new anonymous function will be invoked 
    // very soon, not by us but by the code that lives 
    // inside of "forEach". From (2) we know that 
    // "array1" has 3 elements so we know that our 
    // new anonymous function will run three times.
    // Now we proceed inside of the new anonymous 
    // function because "forEach" is being invoked.
    
      if(!acc.includes(n)) acc.push(n);
      // 9) Our new anonymous function is being 
      // executed! We are inside an outer-loop 
      // "reduce" that is iterating over each element 
      // of "arrays" AND we are inside an inner-loop
      // "forEach" that is iterating over each 
      // element of "array1" or "array2" or "array3".
      // The first thing we see is "if" so the 
      // compiler checks the condition. On the first 
      // iteration, we expect "n" to be "5" and "acc" 
      // is a variable we can access (via closure) 
      // from the outer-loop and it should be an 
      // empty array literal "[]" at first. 
      // Therefore, "acc" does NOT include "5" 
      // and the "if" is "true" so we look at the 
      // next bit. We see "acc" followed by the 
      // dot "." which opens up the array object 
      // to let us access the "push" property
      // which is a function. We see an open 
      // parenthesis "(" which means we are 
      // invoking "push" right now and we can 
      // see we are passing in "n" as a parameter.
      // The "push" function always returns the
      // current length of the array, so on the 
      // first iteration, "acc" was the empty 
      // array literal "[]" but just had "5"
      // pushed onto it, so "push" returns "1"
      // as the new length. But that return
      // value isn't being stored in a variable
      // or anything so it just gets ignored.
      
    });//forEach n
    // 10) That's all there is to the anonymous 
    // function that was passed into "forEach".
    // The function "forEach" always returns 
    // "undefined" and we are not using that 
    // return value for anything so it is 
    // ignored.
     
    return acc;
    // 11) The last thing we do in the "reduction"
    // function is return the updated "acc" 
    // variable now that it has had things 
    // pushed into it by the "forEach". The way 
    // "reduce" works, it needs us to return 
    // the accumulated result at the end of 
    // our callback so that reduce can pass 
    // it into the next invokation of our 
    // callback.
  
  };//reduction
  // 12) And that's it for the "reduction" function.
  // Now we move on to (13) below.

  return arrays.reduce(reduction, []);
  // 6) There's a lot going on here. First we see "return"
  // which means the function will end after this line.
  // Then we see "arrays" and we recognize this. It is the 
  // name of the parameter being passed into the union 
  // function (above). From (3) we know that this will 
  // be an array that contains three other arrays. Next 
  // we see the dot "." which opens up the arrays object 
  // (yes, all arrays are actually just objects) so we 
  // can access its properties. Next we see "reduce" which 
  // is a property that all array objects have. Next we 
  // see the open parenthesis "(" which immediately invokes 
  // this reduce function. The first parameter being 
  // passed into reduce is "reduction" which we recognize
  // because we just declared it above. The second 
  // parameter being passed into reduce is an array literal
  // that contains nothing "[]". Then we see the close 
  // parenthesis ")" and need to know what reduce does.
  // We know that it iterates through "arrays" and calls 
  // the "reduction" function many times, once for each 
  // element of "arrays". In this case, we know "arrays" 
  // is an array that contains three more arrays. So 
  // reduction will be run exactly three times. Now let's 
  // jump back up and into the (7) "reduction" function 
  // to see what that does.
  
  // 13) The "reduce" invoked the "reduction" callback 
  // three times and returned an accumulated result
  // array, which is not being saved into a variable, 
  // but is instead being returned from the union function.
  
};//union
// 14) And that's it for the "union" function, which 
// should always return an array.

var array1 = [ 5, 7, 12 ];
var array2 = [ 33, 7, 45 ];
var array3 = [ 33, 75 ];
// 2) The next line the compiler cares about is down here.
// Again, the compiler doesn't yet care what is inside 
// the union function. So we skip over it and see this line.
// Here, we start with "var" which tells the compiler that 
// a new variable is about to be declared. Next is the 
// variable name "array1". At this point the compiler expects
// either a semicolon ";" or an equals "=". Either is fine 
// but here we're initializing "array1" to something. Next 
// is an open square bracket "[" which tells the compiler 
// this is an array "literal" which means we are creating 
// a new array right now. Everything that follows between 
// the brackets must be comma-delimmitted contents of the 
// array. We do this three times for array1, array2, array3.

console.log(union([ array1, array2, array3 ]));
// 3) Here we see a lot going on. As the compiler, we interpret 
// from left-to-right, so the first thing is the word "console".
// This is an object that lives in the global scope of the 
// javascript language. Every javascript code has a "console" 
// object. Next we see the "." dot which opens up the console 
// object for us to access things inside of it. Next is "log" 
// which is a property of the console object, and it is a 
// function. Next we see an open parenthesis "(" which means 
// the log function must be invoked right now. Everything 
// inside the parenthesis are parameters being passed into 
// the log function for it to execute right now. Next we 
// see the word "union". We recognize this! It is the function 
// we declared earlier but didn't care about yet. Next we 
// see an open parenthesis "(" which means we are now 
// invoking the union function, and must do so before we can 
// invoke the "log" function! So now we have to care about 
// "union"! Before we jump up to that code, we need to know 
// what parameters we are passing into it. Next we see an 
// open square bracket "[" which creates a new array
// literal. The contents of this new array literal 
// is three elements: array1, array2, array3. So the array 
// literal is an array containing three arrays. Then we get 
// the close square bracket "]" followed by the close 
// parenthesis ")" meaning that this array literal is the 
// sole parameter being passed into the union function.
// Now we need to jump up to (4) to see what union does.

// 15) The result of union is an array. We are not saving 
// this result into a variable. Instead, the result is 
// being passed directly into the log function. The log 
// function runs and prints our result to the screen. 
// The log function always returns "undefined" and we are 
// not saving that result into a variable so it is ignored.

// 16) Fin!




















