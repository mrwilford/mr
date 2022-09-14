//mr.js © 2021 Michael Wilford. All Rights Reserved.
//Google Script ID: 1zAQiCMZAozxfzwVxLpu1P22WHpqXvhbwBRu6ZHjlh_kcYdF9ojqM0D_F
//https://cdn.jsdelivr.net/gh/mrwilford/mr/mr.js

// const mrExecutionBegin = new Date();//in case mrCreate() is not called immediately
function mrCreate(scope){
  'use strict';
  if(!scope) scope = {};

  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  ///
  /// DEPENDENCIES
  ///
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////

  if (!luxon) throw new Error('Missing dependency: luxon');

  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  ///
  /// LIBRARY METADATA
  ///
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////

  const name = 'mr';
  const now = luxon.DateTime.fromJSDate(mrExecutionBegin);
  const license = 'mr.js © '+now.year+' Michael Wilford. All Rights Reserved.';
  const version = '1.0.0';
  const lang = 'en-us';

  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  ///
  /// JAVASCRIPT UTILITIES
  ///
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////

  const hourToMs = (hour) => hour * 60 * 60 * 1000;
  const minToMs = (min) => min * 60 * 1000;
  const secToMs = (sec) => sec * 1000;

  /**
   * Create an enum from the given values.
   * @param {*[]} values
   * @return {object}
   */
  const ENUM = (...values) => Object.freeze(Object.assign({},...values.map(x => 
    Object.freeze(is.obj(x) ? {[uno(Object.keys(x))]:uno(Object.values(x))} : {[x]:x})
  )));//ENUM

  /**
   * Utility to make logging messages easier.
   * @param {*} msg
   * @return {*} msg
   */
  const log = function (msg) {
    if (EConfigs.RELEASE == config) return msg;
    if (log.useConsole) console[typeLog ? typeLog.func : 'log'](msg);
    if (log.useLogger) Logger.log((typeLog ? typeLog.desc : '') + msg);
    typeLog = null;
    return msg;
  };//log
  log.info = msg => log(msg, typeLog = infoLogType);
  log.warn = msg => log(msg, typeLog = warnLogType);
  log.error = log.err = msg => log(msg, typeLog = errorLogType);
  const errorLogType = { func: 'error', desc: '❌ ERROR: ' };
  const warnLogType = { func: 'warn', desc: '🚧 WARN: ' };
  const infoLogType = { func: 'info', desc: '🌐 INFO: ' };
  let typeLog = null;

  /**
   * Validate that a given condition is true.
   * @param {*} test - Anything that can be tested for true/false.
   * @param {string|function} [onFail] - Callback to run when test fails, or an error msg to display.
   * @return {*} - The result of onFail() if it is a function, otherwise the boolean value of test.
   * @example assert(myArray.length,'Array is empty!') //returns myArray.length
   */
  const assert = function (test = null, onFail) {
    return test || (is.func(onFail) ? onFail(test) : assertOnFailDefault(test,onFail));
  };//assert
  const assertOnFailDefault = (test,msg) => {
    const stack = getCallstack()[2];
    const desc = ' [' + stack.func + ' (' + stack.file + ':' + stack.line + ')]';
    throw new Error('❌ ASSERT FAILED' + (is.def(msg) ? ': '+msg : '') + desc);
  };//assertOnFailDefault

  /**
   * sleep
   */
  const sleep = (millis) => {
    if (Utilities && is.func(Utilities.sleep)) return Utilities.sleep(millis);
    assert();//not yet supported
  }//sleep

  /**
   * Make a partial call to a function so that it can fully called with more parameters later.
   * 
   * @param {function} func
   * The function to build the partial wrapper for.
   * 
   * @param {*} args
   * Array of arguments to be pre-loaded into the partial function call, defaults to [].
   * 
   * @return {*}
   * Whatever the given func returns.
   *
  const partial = (func, ...args) => {
    if (!args.length) return func;
    return (...additionalArgs) => func.apply(func, [...args, ...additionalArgs]);
  }//partial

  /**
   * Retry a given function a number of times and if it always fails, try something else instead.
   * 
   * @param {function} func
   * Function to try.
   * 
   * @param {number} [options.tries=1]
   * Number of tries to attempt.
   * 
   * @param {number} [options.wait=1000]
   * Milliseconds to wait between attempts.
   * 
   * @param {function} [options.check]
   * A test to see if we should stop trying early.
   * 
   * @param {function} [options.onFail=throw error]
   * What to do if all attempts fail.
   * 
   * @return {*}
   * Result of the given function or options.onFail.
   */
  const retry = (func, onFail, tries=1, wait=0) => {
    for(let i=0; i<tries; ++i){ try{ return func() }catch(err){ Utilities.sleep(wait) } }
    return isFunc(onFail) ? onFail() : onFail;
  }//retry

  /**
   * Poll a function until its return value is truthy or until we run out of time.
   * 
   * @param {function} func
   * The function to poll.
   * 
   * @param {object} [options]
   * 
   * @param {number} [options.period]
   * The duration of time to continue polling for.
   * 
   * @param {number} [options.wait]
   * The amount of time to wait between polling attempts.
   * 
   * @param {*} [options.thisArg]
   * The context on which to run the given function.
   * 
   * @return {*}
   */
  const poll = (func, { period = mr.minToMs(1), wait = mr.secToMs(1), thisArg } = {}) => {
    for (let start = luxon.DateTime.local(); true;) {
      const result = func.call(thisArg);
      if (result) return result;
      if (period < duration(start).milliseconds) return 0;//ran out of time
      if (drive.account.quotas.runtime.limited()) return null;//ran out of execution quota
      sleep(wait);
    }//for
  }//poll

  /**
   * Time a function to see how long it takes in the logs.
   * 
   * @param {function} func
   * Function to profile.
   * 
   * @param {string} [desc]
   * Description to include in log. Defaults to the function name, file, and line number retrieved 
   * from getCallstack(): `${mr.func} (${mr.file}:${mr.line})`.
   * 
   * @param {*} [thisArg]
   * Context to run the given function with. Uses func.call(thisArg,...).
   * 
   * @return {*}
   * Result of the given function.
   */
  const profile = (func, desc, thisArg) => {
    if(!desc){
      const stack = getCallstack()[1];
      desc = stack.func + ' (' + stack.file + ':' + stack.line + ')';
    }//if
    profileStack.push(desc);
    const stackDesc = profileStack.reduce((a,x,i)=>a+' » '+x,'');
    const start = luxon.DateTime.local();
    const result = func.call(thisArg);
    profileStack.pop();
    log.info('⏱ PROFILE: ' + duration({start:start}).as('ms') + 'ms to complete' + stackDesc);
    return result;
  }//profile
  const profileStack = [];

  /**
   * Capture the current callstack and parse it for easy access to line number, file name, etc.
   * @return {[string]}
   */
  const getCallstack = () => {
    try { throw new Error('🔥') }
    catch (err) {
      const display = err.stack.replace(/^.*🔥\n/, '')
        .replace(/\n\s+at __GS_INTERNAL_top_function_call__.gs:1:8/, '');
      let matches = display.split(/\s*at /g);
      matches.shift();//first element is blank
      matches.shift();//next element is this getCallStack
      matches = matches.map(x => ({
        //e.g: "test (mr:1824:3)"
        func   : last(x.match(/(.*)\s+/)) || '',
        file   : last(x.match(/\((.*?)[:)]/)) || '',
        line   : last(x.match(/:(.*):/)) || '',
        column : last(x.match(/\d+:(.*)\)$/)) || '',
      }));//map
      matches.display = display;
      return matches;
    }//catch
  };//getCallstack

  /**
   * Get some lorem ipsum placeholder text.
   * 
   * @param {string} url
   * URL to get the lorem ipsum from, defaults to 'https://loripsum.net/api/'.
   * 
   * @param {[string]} [options]
   * Options to provide to the given url, defaults to [1,'short','plaintext'].
   * 
   * @return {string}
   */
  const getLoremIpsum = (url = 'https://loripsum.net/api/', ...options) => {
    if(!options || !options.length) options = [1, 'short', 'plaintext'];
    options.forEach(x => url += x + '/');
    return UrlFetchApp.fetch(url).getContentText();
  }//getLoremIpsum

  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  ///
  /// TYPE CHECKING
  ///
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////

  /**
   * Determines the type of the given value.
   * @param {*} v - Any value
   * @return {*} An mr constructor function for the given type if mr provides
   * one, otherwise the given value itself is returned.
   */
  const is = function(v){
    if (is.null(v)) return null;
    if (is.nan(v)) return NaN;
    if (is.inf(v)) return Infinity;
    if (is.num(v)) return number;
    if (is.bool(v)) return boolean;
    if (is.str(v)) return string;
    if (is.arr(v)) return array;
    if (is.func(v)) return func;
    if (is.err(v)) return err;
    if (is.date(v)) return date;
    if (is.dt(v)) return dt;
    if (is.dur(v)) return dur;
    if (is.interval(v)) return interval;
    if (is.ss(v)) return drive.ss;
    if (is.sheet(v)) return drive.sheet;
    if (is.form(v)) return drive.form;
    if (is.doc(v)) return drive.doc;
    if (is.slide(v)) return drive.slide;
    if (is.site(v)) return drive.site;
    if (is.page(v)) return drive.page;
    if (is.file(v)) return drive.file;
    if (is.folder(v)) return drive.folder;
    if (is.obj(v)) return obj;
    assert(is.undef(v));
    return undefined;
  };//is

  //TYPE CHECKING////////////////////////////////////////////////////////
  {
    is.undefined = is.undef = v => 'undefined' == typeof v;
    is.defined = is.def = v => !is.undefined(v);
    is.null = v => null===v;
    is.undefNull = v => null==v;
    is.primitive = is.prim = v => v!==Object(v);
    is.boolean = is.bool = v => 'boolean'==typeof v || v instanceof Boolean;
    is.nan = is.NaN = v => is.num(v) && Number(v) !== Number(v);
    is.finite = is.fin = v => is.num(v) && isFinite(v);
    is.infinity = is.inf = v => Infinity===v;
    is.number = is.num = v => 'number'==typeof v || v instanceof Number;
    is.string = is.str = v => typeof v=='string' || v instanceof String;
    is.array = is.arr = v => !!(v && typeof v=='object' && (''+v.constructor)==(''+Array));
    is.function = is.func = v => !!(v && {}.toString.call(v)=='[object Function]');
    is.iterator = v => is.obj(v) && is.func(v.next);
    is.object = is.obj = v => !!(v && typeof v=='object' && (''+v.constructor)==(''+Object));
    is.error = is.err = v => !!(v && v.message);
    is.date = is.Date = v => !!(v && {}.toString.call(v)=='[object Date]');
    is.datetime = is.dt = v => v instanceof luxon.DateTime;
    is.duration = is.dur = v => v instanceof luxon.Duration;
    is.interval = v => v instanceof luxon.Interval;
    is.column = is.col = o => o instanceof col;
    is.spreadsheet = is.ss = o => 'Spreadsheet'==is.drive(o).name;
    is.sheet = o => is.obj(o) && is.func(o.getParent) && is.ss(o.getParent());
    is.form = o => 'Form'==is.drive(o).name;
    is.document = is.doc = o => 'Document'==is.drive(o).name;
    is.presentation = is.slide = o => 'Presentation'==is.drive(o).name;
    is.site = o => 'Site'==is.drive(o).name;
    is.page = o => is.obj(o) && is.func(o.getParent) && is.site(o.getParent());
    is.folder = o => 'Folder'==is.drive(o).name;
    is.file = o => 'File'==is.drive(o).name;
    is.drive = o => {
      let typeName,appName,errMsg;
      try {
        (o.mr || o).getName('INTENTIONALLY INCORRECT PARAMETER');
        return {};
      } catch (err) { 
        //WARNING: this is vulnerable to any changes Google makes to thier error messaging
        errMsg = err.message;
        try { [appName,typeName] = errMsg.match(/signature for (.*App)\.(.*)\.getName/).slice(1) }
        catch (err) { return {} } //not a valid Drive type
      }//catch
      assert(typeName && typeName.length && is.func(o.getId),'Could not get type name from: '+errMsg);
      const mimeType = assert(
        'Folder'==typeName ? MimeType.FOLDER : ('File'==typeName ? o : DriveApp.getFileById(o.getId())).getMimeType()
      );//assert
      const app = assert(scope[appName]);
      const derivedAppMatches = [
        {name:'SpreadsheetApp',app:SpreadsheetApp,mime:MimeType.GOOGLE_SHEETS},
        {name:'DocumentApp'   ,app:DocumentApp   ,mime:MimeType.GOOGLE_DOCS  },
        {name:'FormApp'       ,app:FormApp       ,mime:MimeType.GOOGLE_FORMS },
        {name:'SlidesApp'     ,app:SlidesApp     ,mime:MimeType.GOOGLE_SLIDES},
        {name:'SitesApp'      ,app:SitesApp      ,mime:MimeType.GOOGLE_SITES },
      ].filter(x => x.mime===mimeType);
      const factory = derivedAppMatches.length ? uno(derivedAppMatches) : {app:null};
      return {
        name    : typeName,
        mime    : mimeType,
        creator : app,
        factory : factory,
      };//return
    }//is.drive

    //specialized checks
    is.object.empty = (o) => !Object.getOwnPropertyNames(o).length;
    is.string.blank = (v) => is.str(v) && !v.trim().length;
    is.string.id = (v) => is.str(v) && 44 == v.length && /[A-Z0-9-_]/gi.test(v);
    is.string.mailto = (v) => is.str(v) && v.startsWith('mailto:');
    is.string.url = (v) => {
      return is.str(v) && /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(v)
    }//url
  }

  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  ///
  /// TYPE CONVERSION
  ///
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////

  /////////////////////////////////////////////////////////////////
  // TOOLS
  /////////////////////////////////////////////////////////////////

  /**
   * Concisely swap two variables by using: [foo,bar] = swap(foo,bar)
   * 
   * @param {*}
   * @param {*}
   * @return {[*,*]}
   * 
   * @example [foo,bar] = swap(foo,bar)
   */
  const swap = (x, y) => [y, x];

  /**
   * Callback for loop.
   *
   * @callback loopCallback - value, key, arr, result
   * 
   * @param {object} [loopDescription]
   * 
   * @param {*} [loopDescription.value]
   * The current element being operated on in the loop.
   * 
   * @param {number|string} [loopDescription.key]
   * The current index or key being operated on in the loop.
   * 
   * @param {[*]} [loopDescription.original]
   * The original array being iterated on.
   * 
   * @param {*} [loopDescription.accum]
   * The current and incomplete accumulated result actively being constructed by the loop.
   * 
   * @return 
   */

  /**
   * [IMMUTABLE] Loop can filter, map, reduce, or forEach through all the elements of an 
   * array, all the properties of an object, or all the nodes of an iterator list, and includes 
   * custom keywords for continue and break to end the loop early.
   * 
   * @param {*} target
   * Anything that can be converted to an array (incl. objects) to be iterated over.
   * 
   * @param {loopCallback} func
   * Function to run on each element or property. If an options.initial value is provided (see 
   * options below) then this loopCallback will behave like Array.reduce, otherwise it will 
   * behave like Array.map. Please use loop.break to abort the loop early and loop.continue 
   * to skip an element (i.e: filter it from the result).
   * 
   * @param {object} [options]
   * 
   * @param {*} [options.thisArg]
   * The context on which to run the given function. Uses func.call(thisArg,...)
   * 
   * @param {*} [options.initial]
   * Only valid iff the given function takes 4 arguments such that loop behaves like Array.reduce
   * in which case an initial value can be set. If not provided, loop will use the first element
   * of the given array.
   */
  const loop = (target, func, { thisArg, initial } = {}) => {
    const isReduce = is.def(initial);
    const isObj = is.obj(target) && !is.fin(target.length) && !is.iterator(target);
    const arr = isObj ? Object.entries(target) : array(target);
    let result = isReduce ? initial : [];
    loop: for (let i = 0; i < arr.length; ++i) {
      const key  = isObj ? arr[i][0] :     i ;
      const elem = isObj ? arr[i][1] : arr[i];
      const callbackArg = {
        elem  : elem  , value : elem, element : elem,
        key   : key   , index : key , valueOf : () => key,
        array : arr   , 
        accum : result,
      };//callbackArg
      try {
        const cur = func.call(thisArg, callbackArg);
        if (isReduce) result = cur;
        else if(isObj) result.push([key, cur])
        else{
          const current = {
            elem  : cur   , value : cur, element : cur,
            key   : key   , index : key, valueOf : () => key,
            array : arr   , 
            accum : result,
          };//current
          result.push(current);//push
        }//else
      } catch (err) {
        if (err === loopContinue) continue loop;
        if (err === loopBreak) break;
        throw err;
      }//catch
    }//for
    if(isReduce) return result;
    if(isObj) result = Object.fromEntries(result);
    else{
      //make it easy to get what we want from the result of loop
      obj.def(result,['elems','values' ,'elements'], { get : () => result.map(x => x.elem) });
      obj.def(result,['keys' ,'indexes','indices' ], { get : () => result.map(x => x.key ) });
    }//else
    return result;
  }//loop
  const loopBreak = {};
  const loopContinue = {};
  Object.defineProperties(loop, {
    //filter: { value: {} },
    continue: {
      get: () => { throw loopContinue },
      set: () => assert(),
    },//continue
    break: {
      get: () => { throw loopBreak },
      set: () => assert(),
    },//break
  });//defineProperties

  /**
   * [IMMUTABLE] Check to make sure the given set (array, object, or anything that can be converted
   * to an array) is of the expected length.
   * 
   * @param {*} v
   * Value on which to check its length.
   * 
   * @param {number} [num=1]
   * Expected length of the given value.
   * 
   * @param {function} [onFail=throw Error]
   * Action to take when the value fails to meet our expectations. Defaults to throwing an error.
   * 
   * @return v
   */
  const expect = (v, num = 1, onFail = expectOnFailDefault) => {
    const arr = is.obj(v) ? Object.values(v) : array(v);
    assert(num === arr.length, onFail);
    return v;
  }//expect
  const expectOnFailDefault = (a) => { throw new Error('Unexpected length: ' + a) };

  /**
   * [IMMUTABLE] Verify that the given set (array, object, or something that can be converted
   * to an array) has exactly one element or property, and return that lonesome value.
   * 
   * @param {*} v
   * Value to verify.
   * 
   * @param {function} [onFail]
   * Action to take when the value fails to meet our expectations. Defaults to throwing an error.
   * 
   * @return {*}
   */
  const uno = (v, onFail = expectOnFailDefault) => {
    const arr = is.obj(v) ? Object.values(v) : array(v);
    expect(v, 1, onFail);
    return arr[0];
  }//uno

  /**
   * [IMMUTABLE] Get the last element of the given array, string, or object.
   * 
   * @param {*}
   * 
   * @return {*}
   */
  const last = (v) => {
    const arr = array(v);
    return arr[arr.length - 1];
  }//last

  /**
   * [IMMUTABLE] Get the index/key of a randomly selected element from the given set (array,
   * object, or something that can be converted to an array).
   * 
   * @param {*} v
   * Value to operate on.
   * 
   * @param {number} [n=1]
   * Number of elements to randomly select, preventing duplications.
   * 
   * @param {object} [options]
   * Options for the random number generator.
   * 
   * @return {[number|string]}
   * Array of length equal to the n number of elements requested, containing unique
   * randomly selected indices [0..array.length) or object keys.
   */
  const randomIndex = (v, n = 1, options) => {
    const isObj = is.obj(v);
    const arr = isObj ? Object.entries(v) : array(v);
    assert(n <= arr.length);
    //if(1===n) return rng(union(options, {int: true, min: 0, max: arr.length}));
    const indices = loop(array.new(n), i => rng(union(options, {
      int: true, min: 0, max: arr.length, exclude: i.accum
    }))).elems;//loop
    return isObj ? loop(indices, i => arr[+i][0]).elems : indices;
  }//randomIndex

  /**
   * [IMMUTABLE] Randomly select a number of elements or properties from the given set (array,
   * object, or something that can be converted to an array).
   * 
   * @param {*} v
   * Value to operate on.
   * 
   * @param {number} [n=1]
   * Number of elements to sample, preventing duplications.
   * 
   * @param {object} [options]
   * Options for the random number generator.
   * 
   * @return {[*]}
   */
  const sample = (v, n = 1, options) => {
    const arr = is.obj(v) ? Object.values(v) : array(v);
    assert(n <= arr.length);
    return loop(randomIndex(arr, n, options), i => arr[i.elem]).elems;
  }//sample

  /**
   * [IMMUTABLE] Produce a shuffled copy of the given set (array, object, or something that can
   * be converted to an array), using the Durstenfeld method, an optimized variation of the 
   * Fisher-Yates algorithm. Details here:
   * https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm
   * 
   * @param {*} v
   * Values to shuffle.
   * 
   * @param {object} [options]
   * Options for the random number generator.
   * 
   * @return {[*]}
   */
  const shuffle = (v, options) => {
    const isObj = is.obj(v);
    const arr = isObj ? Object.entries(v) : array(v);
    const rngOpts = union(options, { int: true, max: arr.length });
    loop(arr, i => {
      if (arr.length - 2 < +i) loop.break;//for i from 0 to n−2 do
      const j = rng(union(rngOpts, { min: +i }));//j ← random integer such that i ≤ j < n
      if (!isObj) [arr[+i]   , arr[j]   ] = swap(arr[+i]   , arr[j]   );//exchange a[i] and a[j]
      else        [arr[+i][1], arr[j][1]] = swap(arr[+i][1], arr[j][1]);
    }).elems;//loop
    return isObj ? Object.fromEntries(arr) : arr;
  }//shuffle

  /**
   * [IMMUTABLE] Perform a cartesian product on two sets (array, object, or something that 
   * can be converted to an array) to get an array of all possible combinations.
   * 
   * @param {*} operandLeft
   * Set to perform a product with.
   * 
   * @param {*} operandRight
   * Second set to perform a product with.
   * 
   * @return {[*]}
   */
  const cartesian = (operandLeft, operandRight) => {
    assert(is(operandLeft) === is(operandRight));
    const isObj = is.obj(operandLeft);
    const arrLeft = isObj ? Object.values(operandLeft) : array(operandLeft);
    const arrRight = isObj ? Object.values(operandRight) : array(operandRight);
    return [].concat(...arrLeft.map(x => arrRight.map(y => [].concat(x, y))));
  }//cartesian

  /**
   * [IMMUTABLE] Perform a cartesian product on any number of sets (array, object, or something
   * that can be converted to an array) to get all possible combinations.
   * 
   * @param {*} operandLeft
   * Set to multiplex with.
   * 
   * @param {*} [operandRight]
   * Another set to multiplex with.
   * 
   * @param {[*]} [operandsRest]
   * Additional sets to multiplex with.
   * 
   * @return {[*]}
   */
  const mux = (operandLeft, operandRight, ...operandsRest) =>
    operandRight ? mux(cartesian(operandLeft, operandRight), ...operandsRest) : operandLeft;

  /**
   * [IMMUTABLE]  Calculate the dot product of two vectors represented as array, object,
   * or something that can be converted to an array. The dot product of 
   * A = [a1, a2, ..., an] and B = [b1, b2, ..., bn] is defined as:
   * dot(A, B) = conj(a1) * b1 + conj(a2) * b2 + … + conj(an) * bn
   * 
   * @param {*} operandLeft
   * @param {*} operandRight
   * @return {*}
   */
  const dot = (operandLeft, operandRight) => {
    assert(is(operandLeft) === is(operandRight));
    const isObj = is.obj(operandLeft);
    const arrLeft = isObj ? Object.values(operandLeft) : array(operandLeft);
    const arrRight = isObj ? Object.values(operandRight) : array(operandRight);
    return loop(loop(arrLeft, i => i.elem * arrRight[+i]).elems,
      j => j.accum + j.elem, { initial: 0 } // reduce
    ).elems;//loop
  }//dot

  /**
   * [IMMUTABLE] Calculate the cross product for two vectors represented as array, object, 
   * or something that can be converted to an array. The cross product of 
   * A = [a1, a2, a3] and B = [b1, b2, b3] is defined as:
   * cross(A, B) = [ a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1 ]
   * 
   * @param {*} operandLeft
   * @param {*} operandRight
   * @return {*}
   */
  const cross = (operandLeft, operandRight) => {
    assert(is(operandLeft) === is(operandRight));
    const isObj = is.obj(operandLeft);
    const arrLeft = isObj ? Object.values(operandLeft) : array(operandLeft);
    const arrRight = isObj ? Object.values(operandRight) : array(operandRight);
    assert(arrLeft.length === arrRight.length);
    // 3d e.g: [ 
    //  a1 * b2 - a2 * b1, 
    //  a2 * b0 - a0 * b2, 
    //  a0 * b1 - a1 * b0 
    //]
    return loop(arrLeft, i => {
      const firstIndex = (i + 1) % arrLeft.length;
      const secondIndex = (arrRight.length + i) % arrRight.length;
      return arrLeft[firstIndex] * arrRight[secondIndex] - arrLeft[secondIndex] * arrRight[firstIndex];
    }).elems;//loop
  }//cross

  /**
   * [IMMUTABLE] Create a clone (or deep copy) of the given value.
   * 
   * @param {*} v
   * Any value to clone so that there are no existing references to it.
   * 
   * @return {*}
   */
  const clone = (v) => {
    if (is.prim(v)) return v;
    if (is.date(v) || is.dt(v)) {
      let cloned = new Date();
      cloned.setTime(v.getTime());
      return is.dt(v) ? luxon.DateTime.fromJSDate(cloned) : cloned;
    }//if
    if (is.arr(v)) return loop(v, i => clone(i.elem)).elems;
    assert(is.obj(v));
    return Object.fromEntries(clone(Object.entries(v)));
  }//clone

  //SET OPERATIONS/////////////////////////////////////////////////

  /**
   * [MUTABLE] Clear out the given array or object so that it is empty.
   * 
   * @param {[*]|object} v
   * Array or object on which to clear out.
   * 
   * @return {[]|{}}
   */
  const clear = (v) => {
    if (is.obj(v)) {
      Object.getOwnPropertyNames(v).forEach(x => delete v[x]);
      return v;
    } else if (is.arr(v)) {
      v.length = 0;
      return v;
    }//else if
    return [];
  }//clear

  /**
   * [IMMUTABLE] Perform the set operation UNION on two sets (arrays, objects, or anything that can 
   * be converted to arrays).
   * 
   * @param {*} operandLeft
   * Left operand to perform union.
   * 
   * @param {*} operandRight
   * Right operand to perform union.
   * 
   * @return {[*]|object}
   */
  const union = (operandLeft, operandRight) => {
    assert(is(operandLeft)===is(operandRight),'"'+is(operandLeft)+'" =!= "'+is(operandRight)+'"');
    if (is.obj(operandLeft)) return object.extend({}, operandRight, operandLeft);
    const arrLeft = array(operandLeft);
    const arrRight = array(operandRight);
    return arrLeft.concat(arrRight.filter(x => 0 > arrLeft.indexOf(x)));
  }//union

  /**
   * [IMMUTABLE] Perform a set operation INTERSECT on two sets (arrays, objects, or anything that can
   * be converted to arrays).
   * 
   * @param {*} operandLeft
   * First operand to perform intersect.
   * 
   * @param {*} operandRight
   * Second operand to perform intersect.
   * 
   * @return {[*]|object}
   */
  const intersect = (operandLeft, operandRight) => {
    assert(is(operandLeft)===is(operandRight),'"'+is(operandLeft)+'" =!= "'+is(operandRight)+'"');
    if (is.obj(operandLeft)) return Object.fromEntries(Object.entries(operandLeft).filter(([i, x]) =>
      Object.entries(operandRight).reduce((a, [j, y]) => a + (i == j), 0)
    ));//fromEntries
    const arrLeft = array(operandLeft);
    const arrRight = array(operandRight);
    return arrLeft.filter(x => 0 <= arrRight.indexOf(x));
  }//intersect

  /**
   * [IMMUTABLE] Perform a set operation SUBTRACT on two sets (arrays, objects, or anything that can
   * be converted to arrays).
   * 
   * @param {*} operandLeft
   * First operand to perform subtract.
   * 
   * @param {*} operandRight
   * Second operand to perform subtract.
   * 
   * @return {[*]|object}
   */
  const subtract = (operandLeft, operandRight) => {
    assert(is(operandLeft)===is(operandRight),'"'+is(operandLeft)+'" =!= "'+is(operandRight)+'"');
    if (is.obj(operandLeft)) return Object.fromEntries(Object.entries(operandLeft).filter(
      ([i, x]) => !Object.entries(operandRight).reduce((a, [j, y]) => a + (i == j), 0)
    ));//fromEntries
    const arrLeft = array(operandLeft);
    const arrRight = array(operandRight);
    return arrLeft.filter(x => 0 > arrRight.indexOf(x));
  }//subtract

  /////////////////////////////////////////////////////////////////
  // BOOLEAN
  /////////////////////////////////////////////////////////////////

  const boolean = (v, { trueStrings = _booleanTrueStringsDefault, isCaseSensitive = false } = {}) => {
    const value = is.str(v) ? (isCaseSensitive ? v : v.toLowerCase()).trim() : v;
    const trueStringsMatch = trueStrings.filter(x =>
      value == (isCaseSensitive ? x.trim() : x.trim().toLowerCase())
    );//filter
    if (!!trueStringsMatch.length) return true;
    const nums = numbers(v);
    if (!nums || 1 != nums.length) return false;
    return !!(1 * nums[0]);
  };//boolean
  const _booleanTrueStringsDefault = ['true', 'yes', 'on', '✔', '☑', '✅', '👍'];

  /////////////////////////////////////////////////////////////////
  // NUMBERS
  /////////////////////////////////////////////////////////////////

  /**
   * [IMMUTABLE] Convert almost anything into a number if it isn't already.
   * 
   * @param {*} [v]
   * Value(s) to be converted to a number.
   * 
   * @return {number}
   */
  const number = (v) => uno(numbers(v));

  /**
   * [IMMUTABLE] Convert almost anything into an array of numbers.
   * 
   * @param {*} [v]
   * Value(s) to be converted to an array of numbers.
   * 
   * @return {[number]}
   */
  const numbers = (v) => {
    if (is.fin(v)) return [1 * v];
    if (is.str(v)) return (v.match(/(\d+\.|\d+)+/g) || []).map(x => 1 * x);
    if (is.obj(v)) return Object.keys(v).reduce((a, x) => a.concat(numbers(v[x])), []);
    if (is.arr(v)) return v.reduce((a, x) => a.concat(numbers(x)), []);
    return [];
  };//numbers

  //HELPERS////////////////////////////////////////////////////////
  {
    /**
     * Clamp a given number between a min and max.
     * 
     * @param {number} n
     * Number to clamp.
     * 
     * @param {number} [min=0]
     * 
     * @param {number} [max=1]
     * 
     * @return {number} Between min and max.
     */
    number.clamp = (n, min = 0, max = 1) => max < n ? max : (n < min ? min : n);

    /**
     * Convert a number to a string with options for commas, decimal places, etc.
     * 
     * @param {number} n
     * Number to convert.
     * 
     * @param {object} [options]
     * 
     * @param {boolean} [options.commas=true]
     * True to add commas every 3 digits from right-to-left.
     * 
     * @param {number} [options.decimals=2]
     * Number of decimal places to show.
     * 
     * @return {string}
     */
    number.toString = (n, { commas = true, decimals = 0 } = {}) => {
      const asString = n.toFixed(decimals).toString();
      return commas ? asString.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : asString;
    }//toString

    //NUMBER DISTRIBUTIONS///////////////////////////////////////////

    number.distribution = number.dist = {};

    /**
     * Convert a number uniformly distributed between [0..1] to a number with a gaussian 
     * (i.e. normal) distribution between (0..1).
     * 
     * @param {number} [n]
     * A uniformly distributed number expected to be between (0..1) and will be clamped. 
     * If not provided, a random number will be used.
     * 
     * @param {number} [mean]
     * The desired mean of the normal distribution. If not provided, zero will be used.
     * 
     * @param {number} [variance]
     * The desired variance of the normal distribution. If not provided, one will be used.
     * 
     * @param {function} [impl]
     * Implementation to use. If not provided, the BoxMuller method will be used.
     * 
     * @return {number}
     * A number normally distributed between (-variance..mean..variance).
     */
    number.dist.normal = number.dist.norm = number.dist.gaussian = number.dist.bell =
      function (n, mean, variance, impl = number.dist.boxMuller) { return impl.apply(null, arguments) };

    /**
     * Convert a number uniformly distributed between [0..1] to a number with a gaussian
     * (i.e. normal) distribution between (0..1) using the BoxMuller algorithm.
     * 
     * @param {number} [n]
     * A uniformly distributed number expected to be between (0..1) and will be clamped. 
     * If not provided, a random number will be used.
     * 
     * @param {number} [mean]
     * The desired mean of the normal distribution. If not provided, zero will be used.
     * 
     * @param {number} [variance]
     * The desired variance of the normal distribution. If not provided, one will be used.
     * 
     * @return {number}
     * A number normally distributed between (-variance..mean..variance).
     */
    number.dist.boxMuller = (n = number.rng({ int: true }), mean = 0, variance = 1) => {
      assert(0 <= n && n <= 1);
      n = number.clamp(n, Number.MIN_VALUE, 1 - Number.EPSILON);//(0..1)
      const m = number.rng({ min: Number.MIN_VALUE, max: 1 });//(0..1)
      const distributed = Math.sqrt(-2.0 * Math.log(n)) * Math.cos(2.0 * Math.PI * m);//[-1..0..1]
      return distributed * variance + mean;
    };//boxMuller

    //RANDOM NUMBER GENERATOR////////////////////////////////////////

    /**
     * Generate a uniformly distributed pseudo random number between [0.0, 1.0).
     * 
     * @param {object} [options]
     * Collection of options describing the type of random number to produce. Options may differ depending
     * on the implementation being used.
     * 
     * @param {function} [options.impl]
     * Implementation to use. If not provided, the WichmannHill algorithm will be used.
     * 
     * @return {number}
     */
    number.rng = function ({ impl = number.rng.wichmannHill } = {}) { return impl.apply(null, arguments) };

    /**
     * @param {number}
     * Accessor to the random number generator's seed.
     */
    Object.defineProperties(number.rng, {
      seed: {
        get: () => rngSeedCurrent,
        set: (seed = number.rng.defaultSeed) => {
          wichmannHillGenerators = null;//force the wichmannHill algorithm to re-initialize
          return rngSeedCurrent = seed;
        },//set
      },//seed
      defaultSeed: {
        get: () => 5150,
        set: () => assert(),
      },//defaultSeed
    });//defineProperty
    let rngSeedCurrent = number.rng.defaultSeed;

    /**
     * Generate a uniformly distributed pseudo random number between [0.0, 1.0) using Wichmann–Hill algorithm.
     * 
     * @param {object} [options]
     * Collection of options describing the type of random number to produce.
     * 
     * @param {boolean} [options.int]
     * Request a integer random number.
     * 
     * @param {number} [options.min]
     * Request a random number that is greater than or equal to a min value.
     * 
     * @param {number} [options.max]
     * Request a random number that is less than or equal to a max value.
     * 
     * @param {number[]} [options.exclude]
     * Request a random number that does not belong in a given list.
     * 
     * @return {number}
     */
    number.rng.wichmannHill = function ({ int = 0, min = 0, max = min + 1 + int * 99, exclude = [] } = {}) {
      assert(min < max && (int && is.arr(exclude) || !int && (!exclude || !exclude.length)));
      if (!wichmannHillGenerators) {
        //initialize a new seed
        let seedInitializer = number.rng.seed;
        wichmannHillGenerators = { x: 0, y: 0, z: 0 };
        wichmannHillGenerators.x = (seedInitializer % 30268) + 1;
        seedInitializer = (seedInitializer - (seedInitializer % 30268)) / 30268;
        wichmannHillGenerators.y = (seedInitializer % 30306) + 1;
        seedInitializer = (seedInitializer - (seedInitializer % 30306)) / 30306;
        wichmannHillGenerators.z = (seedInitializer % 30322) + 1;
        seedInitializer = (seedInitializer - (seedInitializer % 30322)) / 30322;
      }//if
      if (int) {
        min = Math.floor(min);
        max = Math.ceil(max);
        const range = subtract(Array(max - min).fill(0).map((x, i) => min + i), exclude);
        assert(range.length, 'rng.int: no valid options between ' + min + ' and ' + max);
        return range[Math.floor(number.rng.wichmannHill() * range.length)];
      }//if
      //now generate the next random number
      wichmannHillGenerators.x = (171 * wichmannHillGenerators.x) % 30269;
      wichmannHillGenerators.y = (172 * wichmannHillGenerators.y) % 30307;
      wichmannHillGenerators.z = (170 * wichmannHillGenerators.z) % 30323;
      const result = (
        wichmannHillGenerators.x / 30269.0 +
        wichmannHillGenerators.y / 30307.0 +
        wichmannHillGenerators.z / 30323.0
      ) % 1.0;//[0..1]
      return min + result * (max - min);//[min..max]
    }//rng.wichmannHill
    let wichmannHillGenerators = null;
  }

  /////////////////////////////////////////////////////////////////
  // STRING
  /////////////////////////////////////////////////////////////////

  /**
   * [IMMUTABLE] Convert almost anything into a string if it isn't already.
   * 
   * @param {*} v
   * Value(s) to be converted to a string.
   * 
   * @return {string}
   */
  const string = (v) => {
    if (is.str(v)) return v;
    if (v && is.func(v.toString)) return v.toString();
    return JSON.stringify(v);
  }//string
  const str = string;

  //HELPERS////////////////////////////////////////////////////////
  {
    /**
     * [IMMUTABLE] Get the left portion of a string.
     * 
     * @param {string} str
     * String to parse.
     * 
     * @param {number} [pos=1]
     * If positive, acts as a left-to-right position of where the result ends (i.e: the length of the result).
     * If negative, acts as a right-to-left position of where the result ends.
     * 
     * @return {string}
     * 
     * @example string.left('abcde', 2) //⇒ 'ab'
     * @example string.left('abcde',-2) //⇒ 'abc'
     */
    string.left = (str, pos = 1) => string(str).substring(0, pos < 0 ? str.length + pos : pos);

    /**
     * [IMMUTABLE] Get the right portion of a string.
     * 
     * @param {string} str
     * String to parse.
     * 
     * @param {number} [pos=-1]
     * If positive, acts as a left-to-right position of where the result begins.
     * If negative, acts as a right-to-left position of where the result begins (i.e: the length of the result).
     * 
     * @return {string}
     * 
     * @example string.right('abcde', 2) //⇒ 'cde'
     * @example string.right('abcde',-2) //⇒ 'de'
     */
    string.right = (str, pos = -1) => string(str).substring(pos < 0 ? str.length + pos : pos);

    /**
     * [IMMUTABLE] Get the middle portion of a string.
     * 
     * @param {string} str
     * String to parse.
     * 
     * @param {number} pos
     * If positive, acts as a left-to-right position of where the result begins.
     * If negative, acts as a right-to-left position of where the result begins.
     * 
     * @param {number} [len=1]
     * The desired length of the result.
     * 
     * @result {string}
     * 
     * @example string.mid('abcde', 2,2) //⇒ 'cd/
     * @example string.mid('abcde',-2,2) //⇒ 'de'
     */
    string.mid = (str, pos, len = 1) => {
      const strConverted = string(str);
      const absPos = pos < 0 ? strConverted.length + pos : pos;
      return strConverted.substring(absPos, absPos + len);
    }//mid

    /**
     * [IMMUTABLE] Insert a string into another string at a given position.
     * 
     * @param {string} str
     * Target string to be injected into.
     * 
     * @param {string} newStr
     * String to inject into the first.
     * 
     * @param {number} [pos=0]
     * If positive, acts as a left-to-right position of where the injection should begin.
     * If negative, acts as a right-to-left position of where the injection should begin.
     * 
     * @return {string}
     * 
     * @example string.insert('abefg','cd', 2) //⇒ 'abcdefg'
     * @example string.insert('abefg','cd',-2) //⇒ 'abecdfg'
     */
    string.insert = string.inject = (str, newStr, pos = 0) => {
      const strConverted = string(str);
      const absPos = pos < 0 ? strConverted.length + pos : pos;
      return [strConverted.slice(0, absPos), newStr, strConverted.slice(absPos)].join('');
    }//insert

    /**
     * [IMMUTABLE] Delivers an all lowercase version of the given string.
     * 
     * @param {string} str
     * String to reproduce as lowercase.
     * 
     * @return {string}
     * 
     * @example string.lower('The #1 Brown Fox') //⇒ 'the #1 brown fox'
     */
    string.lower = string['lowercase'] = (str) => string(str).toLowerCase();

    /**
     * [IMMUTABLE] Delivers an all uppercase version of the given string.
     * 
     * @param {string} str
     * String to reproduce as uppercase.
     * 
     * @return {string}
     * 
     * @example string.upper('The #1 Brown Fox') //⇒ 'THE #1 BROWN FOX'
     */
    string.upper = string['UPPERCASE'] = (str) => string(str).toUpperCase();

    /**
     * [IMMUTABLE] Delivers a titlecase version of the given string.
     * 
     * @param {string} str
     * String to reproduce as titlecase.
     * 
     * @return {string}
     * 
     * @example string.title('The #1 brown fox') //⇒ 'The #1 Brown Fox'
     */
    string.title = string['Title Case'] = (str) => string(str).toLowerCase()
      .replace(/[_-]/g,' ')
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase());

    /**
     * [IMMUTABLE] Delivers a camelcase version of the given string. Unlike converting to lower 
     * or upper case, this requires eliminating non-alphanumeric characters and whitespace.
     * 
     * @param {string} str
     * String to reproduce as camelcase.
     * 
     * @return {string}
     * 
     * @example string.lower('The #1 Brown Fox') //⇒ 'the1BrownFox'
     */
    string.camel = string['camelCase'] = (str) => string(str).toLowerCase()
      .replace(/[_-]/g,' ')
      .replace(/[^a-zA-Z0-9 ]/g,'')
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word,i) => i ? word.toUpperCase() : word.toLowerCase())
      .replace(/\s+/g,'');

    /**
     * [IMMUTABLE] Delivers a pascalcase version of the given string. Unlike converting to lower 
     * or upper case, this requires eliminating non-alphanumeric characters and whitespace.
     * 
     * @param {string} str
     * String to reproduce as pascalcase.
     * 
     * @return {string}
     * 
     * @example string.pascal('The #1 Brown Fox') //⇒ 'The1BrownFox'
     */
    string.pascal = string['PascalCase'] = (str) => string(str).toLowerCase()
      .replace(/[_-]/g,' ')
      .replace(/[^a-zA-Z0-9 ]/g,'')
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
      .replace(/\s+/g,'');

    /**
     * [IMMUTABLE] Delivers a snakecase version of the given string. Unlike converting to lower 
     * or upper case, this requires eliminating non-alphanumeric characters and whitespace.
     * 
     * @param {string} str
     * String to reproduce as snakecase.
     * 
     * @return {string}
     * 
     * @example string.snake('The #1 Brown Fox') //⇒ 'the-1-brown-fox'
     */
    string.snake = string['snake_case'] = (str) => string(str).toLowerCase()
      .replace(/[_-]/g,' ')
      .replace(/[^a-zA-Z0-9 ]/g,'')
      .replace(/\s+/g,'_');

    /**
     * [IMMUTABLE] Delivers a kebabcase version of the given string. Unlike converting to lower 
     * or upper case, this requires eliminating non-alphanumeric characters and whitespace.
     * 
     * @param {string} str
     * String to reproduce as kebabcase.
     * 
     * @return {string}
     * 
     * @example string.lower('The #1 Brown Fox') //⇒ 'the-1-brown-fox'
     */
    string.kebab = string['kebab-case'] = (str) => string(str).toLowerCase()
      .replace(/[_-]/g,' ')
      .replace(/[^a-zA-Z0-9 ]/g,'')
      .replace(/\s+/g,'-');

    /**
     * [IMMUTABLE] Calculate a hash for the given string. Unlike converting to lower 
     * or upper case, this requires eliminating non-alphanumeric characters and whitespace.
     * 
     * @param {string} str
     * String to analyze.
     * 
     * @return {string}
     */
    string.hash = (str) => string(str).split('')
      .reduce((a, x) => (a = ((a << 5) - a) + x.charCodeAt(0)) & a, 0);

    /**
     * [IMMUTABLE] Count the number of nonblank (i.e: non whitespace) characters in the given string.
     * 
     * @param {string} str
     * String to analyze.
     * 
     * @return {string}
     * 
     * @example string.nonblank('The #1 Brown Fox') //⇒ 13
     */
    string.nonblank = (str) => !!string(str).replace(/\s/g, '').length;

    /**
     * [IMMUTABLE] Count how many occurrences of a substring there are.
     * 
     * @param {string} str
     * String to parse.
     * 
     * @param {string} lookFor
     * Substring to look for.
     * 
     * @param {boolean} [overlapping=false]
     * Whether to allow overlapping results or not.
     * 
     * @return {number}
     * 
     * @example string.count('banana','ana',false) //⇒ 1
     * @example string.count('banana','ana', true) //⇒ 2
     */
    string.count = string.has = (str, lookFor, overlapping = false) => {
      const strConverted = string(str);
      if (!lookFor.length) return strConverted.length + 1;
      const step = overlapping ? 1 : lookFor.length;
      for (let n = 0, pos = 0; ; ++n, pos += step) {
        pos = strConverted.indexOf(lookFor, pos);
        if (pos < 0) return n;
      }//while
    };//count

    /**
     * [IMMUTABLE] Find a matching closing brace or tag in a given string.
     * 
     * @param {string} str
     * String to parse.
     * 
     * @param {number} [pos=0]
     * If positive, acts as a left-to-right position of where the open bracket or tag begins.
     * If negative, acts as a right-to-left position of where the open bracket or tag begins.
     * 
     * @param {boolean} [markup=false]
     * Whether the indicated position in the string is a <tag> or not.
     * 
     * @return {number}
     * 
     * @example string.findClosing('abc<d>efg</d>hij',3,{markup=true}) //⇒ 9
     * @example string.findClosing('abc{def<gh>i}j}k',3) //⇒ 12
     */
    string.findClosing = (str, pos = 0, markup = false, brackets = stringFindClosingClosures) => {
      const strConverted = string(str);
      const absPos = pos < 0 ? strConverted.length + pos : pos;
      if (markup) {
        const tag = string.mid(strConverted, absPos, string.findClosing(strConverted, absPos) - absPos + 1);
        const closeTag = string.insert(tag, '/', 1);
        return strConverted.indexOf(closeTag, absPos);
      }//if
      const openBrace = strConverted[absPos];
      const closeBrace = brackets[openBrace];
      assert(closeBrace, 'No matching brace found for: ' + openBrace);
      for (let i = absPos + 1, depth = 1; i < strConverted.length; ++i) {
        if (openBrace === strConverted[i])++depth;
        else if (closeBrace === strConverted[i]) {
          if (0 === --depth) return i;
        }//else if
      }//for
      return -1;//no match
    };//findClosing
    const stringFindClosingClosures = {
      '(': ')', '[': ']', '{': '}', '<': '>',
      '‹': '›', '«': '»', '‹': '›', '⁽': '⁾',
      '⁅': '⁆', '“': '”', '‘': '’', '「': '」',
      '『': '』', '《': '》', '〈': '〉'
    };//stringFindClosingClosures
  }

  string.urlToId = (strUrl) => strUrl.match(/[-\w]{25,}/)[0];
  //TODO: idToUrl = (strId) => 'https://docs.google.com/'+getType(strId)+'/d/'+strId;

  /////////////////////////////////////////////////////////////////
  // FUNCTION
  /////////////////////////////////////////////////////////////////

  /**
   * [IMMUTABLE] Convert almost anything into a function if it isn't already.
   * 
   * @param {*} [v]
   * Value(s) to be converted to a function.
   * 
   * @return {function}
   */
  const func = (v) => is.function(v) ? v : function () { return v };

  /////////////////////////////////////////////////////////////////
  // ARRAY
  /////////////////////////////////////////////////////////////////

  /**
   * [IMMUTABLE] Convert almost anything into an array if it isn't already.
   * 
   * @param {*} [v]
   * Value(s) to be converted to an array.
   * 
   * @return {[*]}
   */
  const array = (...v) => {
    if (!v.length) return undefined;//array(undefined) ⇒ undefined//not [undefined]
    if (1 < v.length) return v;
    v = v[0];
    if (is.arr(v)) return v;
    if (is.prim(v)) return [v];
    if (is.def(v.length)) return Array.from(v);//works on strings, objects w/ length
    if (!is.func(v.next)) return Object.values(v);
    let maxDepth = 1024;
    let result = [];
    while (v.hasNext() && --maxDepth) result.push(v.next());
    assert(maxDepth);
    return result;
  }//array
  const arr = array;

  //HELPERS////////////////////////////////////////////////////////
  {
    /**
     * Create a new array and fill it up.
     * 
     * @param {number} length
     * How long the new array should be.
     * 
     * @param {*} [filler]
     * What the new array should be filled with, or a function that determines each value.
     * 
     * @return {[*]}
     */
    array.new = (length, filler = arrayNewDefaultFiller) => {
      let result = Array(length).fill(is.func(initialValue) ? null : initialValue);
      if(is.func(initialValue)) result = result.map(filler);
      return result;
    }//array.new
    const arrayNewDefaultFiller = (x,i) => i;

    /**
     * [IMMUTABLE] Create a copy of the given array that contains only unique elements.
     * 
     * @param {[*]} arr
     * Array on which to find the unique elements.
     * 
     * @return {[*]}
     */
    array.unique = (arr) => new Set([...arr]);

    /**
     * [MUTABLE] Set an element in the given array to a value. If the index is beyond the length
     * of the array then the array will be grown to that size.
     * 
     * @param {[*]} arr
     * Array on which to find and set an element.
     * 
     * @param {number} i
     * Array index of element to set.
     * 
     * @param {*} value
     * Value to set into the array at the given index.
     * 
     * @return {[*]}
     */
    array.set = (arr, i, value) => {
      if (i < arr.length - 1) arr.length = Math.max(i + 1, arr.length);
      arr[i] = value;
      return arr;
    }//set

    /**
     * [IMMUTABLE] Find an element in the given lookup and return the associated element from the given target.
     * 
     * @param {*} target
     * Anything that can be converted to an array (incl. objects) from which to get results.
     * 
     * @param {*} lookup
     * Anything that can be converted to an array (incl. objects) to be searched in.
     * 
     * @param {*} elem
     * An element that exists one or more times in lookup.
     * 
     * @return {*}
     */
    array.match = (target, lookup, elem, isUnique = true) => {
      console.log('match('+JSON.stringify(target)+','+JSON.stringify(lookup)+','+JSON.stringify(elem)+')');
      const result = array(elem).map(x => {
        const matches = loop(lookup, j => j.elem===x ? target[+j] : loop.continue).elems;
        return isUnique ? matches.uno : matches;
      });//map
      if(is.arr(elem)) return result;
      return uno(result);
    }//match

    /**
     * [IMMUTABLE] Transpose a given 2D array.
     * 
     * @param {[[*]]} arr
     * 2D array to transpose.
     * 
     * @return {[[*]]}
     */
    array.transpose = (arr) => array(arr[0]).map((x, i) => arr.map((y, j) => array(arr[j])[i]));

    /**
     * [IMMUTABLE] Matrix multiply two 2D arrays.
     * 
     * @param {[[number]]} m1
     * First matrix to perform multiply.
     * 
     * @param {[[number]]} m2
     * Second matrix to perform multiply.
     * 
     * @return {[[number]]}
     */
    array.matrixMultiply = array.multiply = array.mmult = (m1, m2) =>
      m1.map((x, r) => array(m2[0])
        .map((x, c) => array(m1[0])
          .reduce((a, x, i) => a + array(m1[r])[i] * array(m2[i])[c], 0)
        )//map
      );//map
  }

  /////////////////////////////////////////////////////////////////
  // OBJECT
  /////////////////////////////////////////////////////////////////

  /**
   * [IMMUTABLE] Convert almost anything into an object if it isn't already.
   * 
   * @param {*} [v]
   * Value(s) to be converted to an object.
   * 
   * @return {object}
   */
  const object = (...v) => {
    if (is.obj(v[0])) return 1 === v.length ? v[0] : Object.assign({}, ...v);
    //func will throw an err if v[0] is a prim or if v isn't the kind of array that Object.fromEntries expects
    return retry(
      /* try    */ () => assert(!is.prim(v[0])) && Object.assign({}, ...v.map(x => Object.fromEntries(x))),
      /* onFail */ () => Object.fromEntries([...v.map((x, i) => [i, x]).concat(v.length ? [['length', v.length]] : [])]),
    );//retry
  };//object
  const obj = object;

  //HELPERS////////////////////////////////////////////////////////
  {
    object.define = object.def = (o, propNames, value) => {
      array(propNames).forEach(x => 
        //unlike Object.defineProperty() we want to default to configurable:true
        Object.defineProperty(o, x, Object.assign({ configurable: true },value))
      );//forEach
      return o;//for chaining
    };//define

    /**
     * [MUTABLE] Alters the given array, deleting all properties until it is empty.
     * 
     * @param {object} o
     * Object to clear.
     * 
     * @return {{}}
     *
    object.clear = object.empty = object.reset = (o) =>
      Object.getOwnPropertyNames(o).forEach(x => delete o[x]) || o;

    /**
     * [MUTABLE] Alter the given object to give it the properties of other objects.
     * 
     * @param {object} dst
     * Destination object to alter.
     * 
     * @param {object} [src]
     * One or more other objects from which to copy properties over to the destination object.
     * 
     * @return {object}
     */
    object.extend = object.combine = object.merge = object.assign = function(dst, ...src){
      //Object.assign(dst,...src);//only works on enumerable properties!
      src.forEach(function(x){
        return obj.keys(x,{ nonenumerable: true }).forEach(function(y){
          return Object.defineProperty(dst,y,{
            configurable: true,
            value: x[y],
          });//defineProperty
        });//forEach
      });//forEach
    };//extend

    /**
     * [IMMUTABLE] Get all of the given object's parents in its prototype chain.
     * 
     * @param {object} o
     * Object whose parents should be retrieved.
     * 
     * @return {[*]}
     */
    object.parents = object.prototypeChain = (o) => o ? [o, ...object.parents(Object.getPrototypeOf(o))] : [];

    /**
     * [IMMUTABLE] Get all the property names (i.e: keys) that a given object has.
     * 
     * @param {object} o
     * Object to operate on.
     * 
     * @param {object} [options]
     * 
     * @param {boolean} [options.inherited=false]
     * Whether prototypes / parents should also be inspected.
     * 
     * @param {boolean} [options.nonenumerable=false]
     * Whether nonenumerable properties should be included.
     * 
     * @return {[string]}
     */
    object.keys = object.propertyNames = (o, { inherited = false, nonenumerable = false } = {}) =>
      (inherited ? obj.parents(o) : [o]).map(x => 
        Object[nonenumerable ? 'getOwnPropertyNames' : 'keys'](x)
      ).flat();//keys

    /**
     * Give an object a cacheable property where the first time it is accessed (e.g: 'obj.foo') the
     * supplied getter function is invoked & on subsequent access the cached result is returned.
     * Additionally, the supplied getter function is callable (e.g: 'obj.getFoo()') directly to allow
     * for bypassing the cache.
     * 
     * @param {object} obj
     * Target object to define new properties on.
     * 
     * @param {string|string[]} [propNames]
     * One or more property names to assign to the cacheable being produced.
     * 
     * @param {function} [getter]
     * The function to run when the cacheable is first called.
     * 
     * @return {object}
     * 
     * @example <caption>Add a specific function as a cacheable value that goes by 2 different names.</caption>
     *          cacheable({id:5},['sound','noise'],()=>'moo') //returns {id:5,sound:'moo'}
     */
    object.cacheable = (o, propNames, getter) => {
      assert(propNames && getter);
      propNames = array(propNames);
      propNames.forEach(x => (x==str.upper(x)) && propNames.push(str.camel(x)));
      propNames.forEach(x => {
        const propName = str(x);
        const getterName = 'get' + propName[0].toUpperCase() + propName.slice(1);
        Object.defineProperty(o, getterName, {
          configurable: true,
          value: function () {
            const value = getter.apply(o,arguments);
            Object.defineProperty(o, propName, { configurable: true, value: value });
            return value;
          },//value
        });//defineProperty
        Object.defineProperty(o, propName, {
          configurable: true,
          set: () => assert(),
          get: () => o[getterName].apply(o),
        })//defineProperty
      });//forEach
      return o;//for chaining
    };//cacheable

    /**
     * Create a cacheable property for each of the given object's methods that begin with 'get' and take 
     * zero parameters. The original getter (e.g: 'getId') remains intact as a way to bypass the cached 
     * value (e.g: 'id').
     * 
     * @param {object} obj
     * Target object to define new properties on.
     * 
     * @return {object}
     * 
     * @example <caption>Convert all getters to cacheable values.</caption>
     *          cacheable({getId:()=>5}) //returns {getId:()=>5,id:5}
     */
    object.cacheables = o => {
      object.keys(o,{ nonenumerable: true }).forEach(x => {
        if(!x.startsWith('get')) return;
        if(0 < o[x].length) return;
        const cacheableName = x[3].toLowerCase() + x.slice(4);//remove "get" and fix camel case
        if(!o.mr) o.mr = {};
        o.mr[x] = o[x];//keep a hidden copy of the old function because this one is about to get overwritten
        object.cacheable(o,cacheableName,o.mr[x]);
      });//forEach
      return o;//for chaining
    };//cacheables
  }

  /////////////////////////////////////////////////////////////////
  // DATE
  /////////////////////////////////////////////////////////////////

  /**
   * [IMMUTABLE] Create a date from the given value. This is a wrapper around luxon.DateTime
   * with only a few added features, such as the ability to get the date & time in serial
   * number format for compatibility with Google Sheets.
   * 
   * @param {*} [v]
   * Value to create a new date from. If not provided, a date for right now will be created.
   * If the value is a string, the format and options parameters should also be provided to 
   * describe the best way to parse the desired date.
   * 
   * @param {string} [format]
   * Only valid if the given value is a string. This format parameter describes ho
   * The format that the given value string is expected to be in. For more information see:
   * https://moment.github.io/luxon/docs/manual/parsing.html#table-of-tokens
   * 
   * @param {object} [options]
   * 
   * @param {string} [options.zone]
   * Use this zone if no offset is specified in the input string itself. Will also convert the 
   * DateTime to this zone.
   * 
   * @param {string} [options.setZone]
   * Override the zone with a zone specified in the string itself, if it specifies one.
   * 
   * @param {string} [options.locale]
   * A locale string to use when parsing. Will also set the DateTime to this locale.
   * 
   * @param {string} [options.numberingSystem]
   * The numbering system to use when parsing. Will also set the resulting DateTime to this 
   * numbering system.
   * 
   * @param {string} [options.outputCalendar]
   * The output calendar to set on the resulting DateTime instance.
   * 
   * @return {luxon.DateTime}
   */
  const date = (v, format, options) => {
    assert(!format && !options || is.str(v));
    let dt = (() => {
      if(is.dt(v)) return v;
      if(is.date(v)) return luxon.DateTime.fromJSDate(v);
      if(is.str(v) && is.str(format)) return luxon.DateTime.fromString(v,format,options);
      if(is.str(v)) return luxon.DateTime.fromISO(v);
      if(is.undef(v)) return luxon.DateTime.local();
      assert(is.finite(v));
      //assume given value is a serial number to convert
      var intPart = Math.floor(v);
      var fracPart = v - intPart;
      var time = Math.round(fracPart * 24 * 60 * 60 * 1000);
      var d = new Date(Date.UTC(1899, 11, 30 + intPart) + time);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      return luxon.DateTime.fromJSDate(d);
    })();//use anon func to make code cleaner with returns
    dt.serial = serial;
    return dt;
  }//date

  /**
   * Convert a date into a serial number (as used by services such as Google Sheets).
   * 
   * @param {*} [d]
   * Value that can be coerced into a date
   * 
   * @return {number}
   */
  const serial = (d = new Date()) => {
    if (is.dt(d)) d = d.toJSDate();
    return ((d.getTime() - minSerial.getTime()) / 60000 - d.getTimezoneOffset()) / 1440;
  };//serial
  const minSerial = new Date(Date.UTC(1899, 11, 30, 0, 0, 0, 0));//starting value for Google serial dates

  // Doing this here instead of in extendPrototypes() because luxon is not a JS
  // primitive type and we want this functionality everywhere.
  object.cacheable(luxon.DateTime, ['serial', 'serialNumber', 'serialNum'],
    function () { return serial(this.toJSDate()) });

  /////////////////////////////////////////////////////////////////
  // DURATION
  /////////////////////////////////////////////////////////////////

  /**
   * Calculate the duration between two times and return a specialized duration object 
   * that resembles a luxon Duration object but maintains a luxon Interval and the 
   * start & end points behind the scenes so that the resultant luxon Duration is 
   * always recalculated based on the latest interval.
   * 
   * @param {DateTime} [start]
   * The start time of the desired duration given as a luxon DateTime. If not provided, the time of 
   * the last call to duration will be used, or the entry point start time of the current execution.
   * 
   * @param {DateTime} [end]
   * The ending time of the desired duration given as a luxon DateTime. If not provided, the current
   * time will be used.
   * 
   * @return {object}
   * A custom object that resembles a luxon Duration object (has all the same methods) plus data
   * members to access or change the start and end points which triggers a duration recalculation.
   */
  const duration = ({start, end, name}={}) => {
    const now = luxon.DateTime.local();
    let _start = start || durationLastCall[name] || entry.time;
    let _end = end || now;
    if(name) durationLastCall[name] = now;
    assert(_start <= _end,'Duration: '+
      'Start ('+_start.toFormat('h:mm:ss.S')+') is bigger than End ('+_end.toFormat('h:mm:ss.S')+')!'
    );//assert
    const refresh = () => {
      const _duration = luxon.Interval.fromDateTimes(_start,_end).toDuration();
      Object.defineProperties(_duration, {
        start: {
          enumerable: true,
          get: () => _start,
          set: (dt) => {
            assert(is.dt(dt));
            _start = dt;
            refresh();
            return dt;
          },//set
        },//start
        end: {
          enumerable: true,
          get: () => _end,
          set: (dt) => {
            assert(is.dt(dt));
            _end = dt;
            refresh();
            return dt;
          },//set
        },//end
      });//defineProperties
      return _duration;
    }//refresh
    return refresh();
  }//duration
  let durationLastCall = {};

  /////////////////////////////////////////////////////////////////
  // COLUMN
  /////////////////////////////////////////////////////////////////

  const col = ({ number, letter, heading } = {}) => {
    //TODO
  }//col

  /**
   * Convert the given column reference into a column letter.
   * @param column : reference | colNumber | colHeading
   * @param reference : {letter:string | number:number | heading:string}
   * @param colNumber : number - Column number, starting with 1.
   * @param colHeading : string - Value of first row in column.
   * @param headings : undefined | [string] - Column headings to search through, necessary if column is given as a heading.
   * @return string - Column letter in absolute A1 notation, must begin with $.
   */
  const column = function(col){
    const result = {};
    const asciiA = 'A'.charCodeAt(0);
    if(is.obj(col)) col = col.letter || col.number;
    if(is.num(col)){
      assert(0 < col, 'colToLetter: Invalid column number');
      result.number = col;
      while(0 < col){
        const temp = (col - 1) % 26;
        result.letter = String.fromCharCode(temp + asciiA) + (result.letter||'');
        col = (col - temp - 1) / 26;
      }//while
      result.valueOf = () => result.letter;//you gave me a number so here's a letter
    }else{
      assert(is.str(col));
      result.letter = col;
      result.number = 0;
      for(let i=0;i<col.length;++i){
        result.number += (col.charCodeAt(i) - (asciiA-1)) * Math.pow(26,col.length - i - 1);
      }//for
      result.valueOf = () => result.number;//you gave me a letter so here's a number
    }//if
    return result;
  }//column

  /**
   *
   */
  const parseRangeAddress = function(address){
    const result = {first:{col:{}},last:{col:{}}};
    result.address = address.replace(/\$/g,'').trim().toUpperCase();
    result.sheet = result.address.has('!') ? last(result.address.match(/(.*)\!/)) : undefined;
    result.a1 = result.address.replace(result.sheet+'!','');
    result.first.a1 = last(result.a1.match(/.*?(?=\:|$)/));
    result.first.row = last(result.first.a1.match(/([0-9]+)/));
    result.first.col.letter = last(result.first.a1.match(/([a-z]*)/i)) || 'A';
    result.first.col.number = column(result.first.col.letter).number;
    result.last.a1 = last(result.a1.match(/(\:|$)(.*)/)) || result.first.a1;
    result.last.row = last(result.last.a1.match(/\d*$/));
    result.last.col.letter = last(result.last.a1.match(/([a-z]*)/i));
    result.last.col.number = column(result.last.col.letter).number;
    result.addRight = function(){
      this.last.col.letter = column(++this.last.col.number).letter;
      this.last.a1 = this.last.col.letter+this.last.row;
      this.a1 = this.first.a1+':'+this.last.a1;
      if(this.sheet) this.address = this.sheet+'!'+this.a1;
      return this;
    };//addRight
    result.addLeft = function(){
      this.first.col.letter = column(--this.first.col.number).letter;
      this.first.a1 = this.first.col.letter+this.first.row;
      this.a1 = this.first.a1+':'+this.last.a1;
      if(this.sheet) this.address = this.sheet+'!'+this.a1;
      return this;
    };//addLeft
    assert(result.first.col.number<=result.last.col.number);
    return result;
  }//parseRangeAddress

  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  ///
  /// CLIENT / SERVER
  ///
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////

  const isClient = 'undefined'!=typeof window;//we are executing as the client
  const client = isClient && {};
  const server = isClient && {};
  const drive = !isClient && (fileDesc => drive.get(fileDesc));

  if(isClient){
    //
    // DEFINE WHAT A CLIENT IS TO A CLIENT...
    //
    assert(document && M);//we depend on the document dom tree and materializecss
    client.select = domSelectStr => [...document.querySelectorAll(domSelectStr)];
    document.addEventListener("DOMContentLoaded", client.init = () => {
      //NOTE: this is scheduled to run when the document is ready!
      //init MATERIALIZECSS and collapse all collapsibles
      M.AutoInit();
      // $('.collapsible.expandable').each(x => M.Collapsible.init(x[0], { accordion: false }));
      client.select('.collapsible.expandable').forEach(x => M.Collapsible.init(x[0], { accordion: false }));
      //ensure unique ids
      const ids = client.select('*').map(x => ({ id: x.id, count: 0 }));
      client.select('*').forEach(x => {
        const matches = ids.filter(y => y.id === x.id);
        matches.uno;//if(matches.length) this.id += (matches.uno.count++).toString().pad(4);
      });//each
      const states = [];
      //TODO: attach events
      client.select('*').forEach(x => x.getAttribute('data-mr'));
      server.load(states);
    });//init
    client.goto = function (args, dom) {
      var main = client.select('main').uno;
      var href = client.select('#' + dom.attr('href').replace(/\#/g, ''));
      if (!href.length) return log('goto href not found: ' + dom.attr('href'), 'warn');
      var ul = href.parents('ul');
      var li = href.parents('li');
      var liIsActive = 0 <= (li.attr('class') || '').indexOf('active');
      var tab = href.parents("div[id*='tab']");
      var tabIsActive = 0 <= (tab.attr('class') || '').indexOf('active');
      var hrefIsHeader = 0 <= (href.attr('class') || '').indexOf('collapsible-header');
      //FIX ME: client.select('ul.tabs').tabs('select', tab.attr('id'));//goto tab
      if (ul.length && !hrefIsHeader) M.Collapsible.getInstance(ul).open(li.index());
      if (tabIsActive && liIsActive) main.animate({ scrollTop: 0 }, 500);
      else setTimeout(function () {
        var scrollAmt = href.offset().top - tab.offset().top + 20;
        main.animate({ scrollTop: scrollAmt }, 200);
      }, 400);//setTimeout
    }//goto
    client.selectProps = function (dest) {
      client.select('#' + dest).innerHTML = 'Getting properties...';
      run({
        req: 'propAll', success: function (props) {
          props = Object.keys(props)
            .sort(function (a, b) { return a < b ? -1 : 1 })
            .map(function (x) {
              return {
                prop: x,
                type: props[x].type,
                //color : props[x].type=='doc' ? '#' : (props[x].type=='scr' ? '' : ''),
                value: props[x].value
              }//return
            });//map
          var newHtml = props.reduce(function (a, x) {
            var value = x.value
              .replace(/</g, '&lt;')
              .replace(/&/g, '&amp;')
              .replace(/'/g, '&apos;')
              .replace(/"/g, '&quot;');
            return a + '<div><code>[' + x.type + ']</code><a href="##" class="link small" onclick=\'run({' +
              '    req:"editProp_' + x.type + '",' +
              '    args:"' + x.prop + '",' +
              '    success:function(v){if(v)client.selectProps("' + dest + '")}' +
              '})\'> ' + x.prop + ' </a></div>';
          }, '');//reduce
          client.select('#' + dest).innerHTML = newHtml;
        }//success
      });//run
    }//getProps
    client.showEditURL = function (args) {
      run({
        req: args, success: function (url) {
          if (isString(url) && url.length) run({
            req: 'showURL',
            args: url.replace('viewform', 'edit')
          });//run
        }//success
      });//run
    }//showEditURL
    client.iframeLaunch = function (args) {
      run({
        req: args.getUrl, args: args.args, success: function (url) {
          if (isString(url) && url.length){
            client.select('#' + args.target)
            .innerHTML = '<iframe width="1" height="1" src="' + url + '"></iframe>';
          }
        }//success
      });//run
    }//iframeLaunch
    client.toggle = function (args) {
      //$('#'+args.id).css('display',args.value ? 'block' : 'none');//hide/unhide
      //$('#'+args.id).children().each(function(){$(this).prop('disabled',!args.value)});
      var descend = function (doms) {
        doms.forEach(x => {
          x.children.forEach(y => {
            descend(y);
            y.disabled = !args.value;
          });//each
        })//each
      };//descend
      descend(client.select('#' + args.id));
    }//toggle
    client.simulateReg = function (args, dom) {
      run({
        req: 'simulateRegs', args: args, success: function (x) {
          client.select('#txtTestNumRegs').value = 1;
          M.updateTextFields();//refresh any text fields
        }//success
      });//run
    }//simulateReg
    client.checkRegForm = function (args, dom) {
      const status = client.select('#spnStatusRegForm');
      status.innerHTML = statusErr + 'Out of date';
      status.className = 'error';
    }//checkRegForm
    //
    // DEFINE WHAT A SERVER IS TO A CLIENT...
    //
    server.responses = [];
    server.request;//TODO
    server.load = states => {
      server.request({ 
        req: 'load', 
        args: states, 
        immediate: true,
        success: results => results.forEach(x => {
          client.select(x.domId).dataset.mr
        }),//success
        failure: 1,
      });//request
    }//load
  }else{
    //
    // DEFINE OUR SERVER-ONLY (E.G: GOOGLE DRIVE) FUNCTIONALITY...
    //
    assert(DriveApp && Sheets);//we depend on the Drive and Sheets apis
    let _readRequests = [];
    let _readResponse = {};

    /**
     * batchGet(requests,mode)
     * Use the Sheets API to read the given requests.
     *
     * @param {string} spreadsheetId - ID of the spreadsheet file to read.
     * @param {[string]} requests - Array of strings denoting range addresses to read (comma separated).
     * @param {string} [mode] - Defaults to 'FORMULA' mode.
     * 
     * @return {object} - Response from the Sheets API.
     * 
     * @example batchGet("'Sheet1'!A1:B8,'Sheet2'!A1:C3","FORMATTED")
     */
    const batchGet = (spreadsheetId, requests, mode = batchGet.formula.mode, dim = 'ROWS') => {
      assert(is.str(spreadsheetId) && spreadsheetId.length);
      uno(loop(obj.keys(batchGet), i => batchGet[i.elem].mode === mode ? i : loop.continue));
      try {
        //mr.drive.quotas.read.last.time = luxon.DateTime.local();
        //mr.drive.quotas.read.last.num  = requests.length;
        return profile(() => retry(() => Sheets.Spreadsheets.Values.batchGet(spreadsheetId, {
          ranges               : requests,
          majorDimension       : dim,			        //valid options: ROWS,COLUMNS,DIMENSION_UNSPECIFIED
          valueRenderOption    : mode,			      //valid options: FORMATTED_VALUE,UNFORMATTED_VALUE,FORMULA
          dateTimeRenderOption : 'SERIAL_NUMBER', //valid options: FORMATTED_STRING,SERIAL_NUMBER
        })), 'batchGet');//profile
      } catch (err) {
        let msg = err.message;
        if (msg.has('Response Code: 413')) msg = 'batchGet: Request Entity Too Large';
        msg += '\nRequests: ' + JSON.stringify(requests);
        throw new Error(msg + '\n\n' + err.stack);
      }//catch
    };//batchGet
    batchGet.unformatted = {
      //UNFORMATTED_VALUE : Values will be calculated, but not formatted in the reply. For example, if A1 
      //is 1.23 and A2 is =A1 and formatted as currency, then A2 would return the number 1.23.
      //This is the default mode and has the alias "values", e.g: mySheet.values[].
      mode: 'UNFORMATTED_VALUE',
      nicknames: ['unformatted', 'values',],
    };//unformatted
    batchGet.formatted = {
      //FORMATTED_VALUE : Values will be calculated & formatted in the reply according to the cell's 
      //formatting. Formatting is based on the spreadsheet's locale, not the requesting user's locale. For 
      //example, if A1 is 1.23 and A2 is =A1 formatted as currency, then A2 would return the string "$1.23".
      mode: 'FORMATTED_VALUE',
      nicknames: ['formatted', 'texts',],
    };//formatted
    batchGet.formula = {
      //FORMULA : Values will not be calculated. The reply will include the formulas. For example, if A1 
      //is 1.23 and A2 is =A1 and formatted as currency, then A2 would return "=A1".
      mode: 'FORMULA',
      nicknames: ['formula', 'formulas',],
    };//formula
    //TBD: batchGet.format = { mode:'FORMAT',nicknames:['format','formats',], }

    drive.get = fileDesc => {
      if(fileDesc===null) return null;
      if(fileDesc===undefined) return drive.active;
      if(is.str.id(fileDesc)) return drive(profile(() => 
        DriveApp.getFileById(fileDesc),'DriveApp.getFileById'
      ));//drive
      if(is.str.url(fileDesc)) return drive(drive.urlToId(fileDesc));
      if(is.str(fileDesc)) return drive(drive.byPath(fileDesc));
      const type = is.drive(fileDesc);
      assert(is.obj(fileDesc) && type && type.mime);
      if(fileDesc.mr) return fileDesc;//an mr.drive.file was passed in
      const id = fileDesc.getId();
      const isDerived = DriveApp!==type.creator;
      if(isDerived) return drive(DriveApp.getFileById(id));
      if(!drive.cache) drive.cache = {};
      if(drive.cache[id]) return drive.cache[id];//cache hit
      let mrDoc = {mr:{}};
      let gFile = fileDesc;
      let gDoc = profile(()=>type.factory.app.openById(id),type.factory.name+'.openById');
      obj.extend(mrDoc,gFile);//inherit from file
      obj.extend(mrDoc,gDoc);//inherit from doc/spreadsheet/form/etc
      obj.cacheables(mrDoc);//add some shortcuts and value cacheing for simple getters
      if(!mrDoc.getMimeType){
        //always assume files with no type are folders
        mrDoc.getMimeType = () => MimeType.FOLDER;
        mrDoc.mimeType = MimeType.FOLDER;
      }//if
      mrDoc.type = mrDoc.mimeType;
      //do type specific init
      switch(mrDoc.type){
        default:
          log.warn('mr.drive: Unexpected file type: '+mrDoc.type);
          break;
          
        /////////////////////////////////////////////////////////////////////////////////////////////////////
        /////////////////////////////////////////////////////////////////////////////////////////////////////
        case MimeType.FOLDER:
          obj.cacheable(mrDoc,'files'  ,() => loop(gFile.getFiles  (),f => drive(f.elem)).elems);
          obj.cacheable(mrDoc,'folders',() => loop(gFile.getFolders(),f => drive(f.elem)).elems);
          mrDoc.get = desc => {
            const byType = is.str(desc) && !!Object.keys(MimeType).filter(x => x==desc).length;
            const method = byType ? 'ByType' : 'ByName';
            const result = array(mrDoc['files'+method](desc));
            if(!result.length) result = array(mrDoc['folders'+method](desc));
            return result.map(x => drive(x));
          }//get
          break;
          
        /////////////////////////////////////////////////////////////////////////////////////////////////////
        /////////////////////////////////////////////////////////////////////////////////////////////////////
        case MimeType.GOOGLE_SHEETS:
          //add new properties to:
          //mrDoc
          //  .sheets -> {}
          //    [...sheetNames,...sheetIds,...sheetIndices,...sheetNameAbbr]
          //      <extended sheet>
          //      .headings -> [heading strings]
          //      [values,formula,text] -> {reference to mrDoc[values,formula,text][sheetName]}
          //  [values,formula,text] -> {}
          //    [...sheetNames,...sheetIds,...sheetIndices,...sheetNameAbbr] -> [[array of array of data]]
          //      [...columnNumbers,...columnLetters,...columnHeadings,...columnHeadingAbbr] -> [array of data]
          //        [...rowNumbers] -> data
          //        .heading        -> string
          //        .number         -> number
          //        .letter         -> string
          //        .headingAbbr    -> string
          //        .sheet          -> {reference to mrDoc.sheets[sheetName]}

          const resetReadCacheables = () => {
            object.keys(batchGet).forEach(modeType => {
              const type = batchGet[modeType];
              obj.cacheable(mrDoc,[type.mode,...type.nicknames],() => {
                const activeReq = _readRequests
                .reduce((a,y) => a+(y[type.mode]||''),'').slice(0,-1);//drop trailing comma
                if(activeReq.length) profile(() => 
                  mrDoc.read.go(type.mode),//⏳ expensive read happens here
                  'read.go'
                );//profile
                return assert(_readResponse[type.mode],'Must call ss.read([sheets]) first!');
              });//cacheable formatted/unformatted/formulas
            });//forEach
          };//resetReadCacheables

          resetReadCacheables();//also call this during read()

          const gSheets = profile(() => gDoc.getSheets(),'getSheets');

          const readHeadings = (sheet = null) => {
            //if(!sheet || !sheet.mr.headings) profile(() => {
            //const requests = arr(mrDoc.sheets).reduce((a,s) => 
            //  a+"'"+s.name+"'!"+s.headingRow+':'+s.headingRow+','
            //,'').slice(0,-1);
            //const response = batchGet(mrDoc.id,requests,batchGet.formatted.mode);
            //response.valueRanges.forEach(valueRange => {
            //  const parsed = parseRangeAddress(valueRange.range);
            //  const s = assert(mrDoc.sheets[parsed.sheet]);
            //  assert(!s.mr.headings);
            //  s.mr.headings = valueRange.values[0];
            //});//forEach
            //},'ss.readHeadings');//profile
            //return sheet && sheet.mr.headings;
            if(!sheet || !sheet.mr.headings) profile(() => arr(mrDoc.sheets).forEach(s => {
              assert(!s.mr.headings);
              //if we called ss.read.go() before now then we may have read headings already
              s.mr.headings = [ 
                null,//make array indices match column numbers (start with 1 not 0)
                ...s.getRange(s.headingRow,1,1,s.lastColumn)
                .getValues()[0]//TODO: use batchGet to get all sheets!
              ];//assign s.mr.headings
            }),'ss.readHeadings');//profile
            return sheet && sheet.mr.headings;
          };//readHeadings

          //define sheets belonging to spreadsheets
          obj.cacheable(mrDoc,'sheets',() => {
            const sheets = {};
            gSheets.forEach(s => {
              obj.cacheables(s);
              s.mr = {};
              s.uppername = str.upper(s.name);
              s.shortname = s.abbr = s.camelname = string.camel(s.name);
              obj.cacheable(s,['headingRow','headingsRow'],() => s.frozenRows || 1);
              obj.cacheable(s,['ss','parent'],() => drive(s.getParent()));
              obj.cacheable(s,'headings',() => readHeadings(s));
              obj.cacheable(sheets,[
                s.name,      //proper name allowing spaces, etc
                s.abbr,      //convenient js-friendly camelCase name
                s.index-1,   //adjust to be 0-based instead of 1-based
                s.sheetId,   //problematic bc first sheet gets id 0 for some reason
                s.uppername, //what batchGet uses
              ],() => s);
              assert((sheets.length||0) < s.index);//ss.getSheets() must give us sheets in index order
              sheets.length = s.index;
            });//forEach
            return sheets;
          });//cacheable sheets

          //for added convenience, define headings
          obj.cacheable(mrDoc,'headings',() => {
            const headings = {};
            arr(mrDoc.sheets)
            .forEach(s => obj.cacheable(headings, [s.name,s.abbr,s.uppername], () => s.headings));
            return headings;
          });//cacheable headings

          /**
           * spreadsheet.read(sheets)
           * Queue up the given sheets to be read into memory the next time values (formatted, unformatted, formulas, etc)
           * are invoked (e.g: ss.values.directors.ids[4]).
           *
           * @param {sheet[] | string[]} [sheets] - Defaults to all sheets.
           * 
           * @return {spreadsheet} - The spreadsheet, for chaining purposes.
           *
           * @example mr.drive().read() //returns the active spreadsheet after all sheets have been queued for reading
           * @example ss.read('Sheet1') //returns ss after it has queued Sheet1 to be read into memory
           */
          //function that reads in data
          //TODO: support reading only certain columns from a sheet
          mrDoc.read = (sheets) => {
            (sheets || arr(mrDoc.sheets)).forEach(s => {
              const req = {orig:''};
              if(string.has(req.orig,"'"+s.name+"'!")) return log.warn('No need to ss.read(["'+s.name+'"]) twice!');
              req.orig += "'"+s.name+"'!"+"A1:ZZZ";//sheet.dataRange.getA1Notation();
              object.keys(batchGet).forEach(x => req[batchGet[x].mode] = req.orig);
              _readRequests.push(req);
            });//forEach
            resetReadCacheables();
            return mrDoc;//for chaining
          };//read

          /**
           * spreadsheet.read.go(valueType)
           * Execute the memory read that has been queued up by previous calls to spreadsheet.read(). This is 
           * implicitly called whenever values (formatted, unformatted, formulas, etc) are invoked 
           * (e.g: ss.values.directors.ides[4]).
           *
           * @param {string} [valueType] - Defaults to all 'unformatted'.
           * 
           * @return {[[*]]} - The values read into memory.
           *
           * @example mr.drive().read.go('unformatted') //returns the values read into memory
           */
          mrDoc.read.go = (mode = batchGet.formula.mode) => {
            const requests = _readRequests.map(x => x[mode]);
            assert(requests.length);
            _readRequests.forEach(x => x[mode] = null);//don't re-read the same req later
            const response = batchGet(mrDoc.id,requests,mode,'COLUMNS');
            //console.log(response.valueRanges.map(s => s.range));
            //batchGet returns object: {
            //  spreadsheetId: string,
            //  valueRanges: [...,{                   //array of valueRanges for each sheet
            //    range          : string,
            //    majorDimension : enum (Dimension),
            //    values         : [ [ ] ],           //array of columns containing array of row values
            //  },...]//valueRanges
            //}
            assert(response && response.spreadsheetId==mrDoc.id);
            response.valueRanges.forEach(s => {
              const parsed = parseRangeAddress(s.range);
              const sheet = assert(mrDoc.sheets[parsed.sheet]);
              if(!_readResponse[mode]) _readResponse[mode] = {};
              if(_readResponse[mode][parsed.sheet]) log.warn('Reading over "'+sheet.name+'" sheet data!');
              s.values.unshift(null);//make array indices match sheet column numbers
              sheet.mr.headings = mode == batchGet.formula.mode ? 
                sheet.headings : //get the headings as values because they may have formulas in them
                s.values.map(x => x && x[sheet.headingRow - 1]);//set the headings because we just got them as values
              sheet.mr.headings.forEach((heading,colNumber) => {
                if(!heading) return;//ignore null sentinel
                if(!s.values[colNumber]) return;//blank column
                const firstRow  = sheet.headingRow+1;
                const lastRow   = s.values[colNumber].length;
                for(let i=0;i<sheet.headingRow;++i) s.values[colNumber].shift();//drop heading and non-data rows
                const colLetter = column(colNumber).letter;
                const abbr      = str.camel(heading);
                const a1        = "'"+sheet.name+"'!$"+colLetter+"$"+firstRow +":$"+colLetter+"$"+lastRow  ;
                const r1c1      = "'"+sheet.name+"'!R"+firstRow +"C"+colNumber+":R"+lastRow  +"C"+colNumber;
                s.values[colNumber].number  = colNumber;
                s.values[colNumber].letter  = colLetter;
                s.values[colNumber].heading = heading;
                s.values[colNumber].abbr    = abbr;
                s.values[colNumber].address = { a1:a1, r1c1:r1c1, valueOf:()=>a1 };
                s.values[heading  ]         = 
                s.values[abbr     ]         = 
                s.values[colLetter]         = s.values[colNumber];
              });//forEach
              _readResponse[mode][sheet.name   ] = 
              _readResponse[mode][sheet.abbr   ] = 
              _readResponse[mode][sheet.sheetId] = 
              _readResponse[mode][sheet.index  ] = s.values;
            });//forEach
            return _readResponse[mode];
          };//read.go
          break;
          
        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        case MimeType.GOOGLE_FORMS:
          //TODO: do not build response table until form.table is invoked
          break;
      }//switch
      return drive.cache[id] = mrDoc;
    };//drive.get

    //inherit from DriveApp and add some shortcuts and value cacheing for simple getters
    obj.extend(drive,DriveApp);
    obj.cacheables(drive);

    drive.auth = true;//assume we are authorized unless told otherwise
    drive.byPath = (path) => {
        const onFail = (n,msg) => { if(n) log.warn('Multiple '+msg); else throw new Error('No '+msg) };
        return drive(path.split(/[\\\/]/).reduce((a,x,i,arr) => {
          if( '.'==x) return a;
          if('..'==x) return array.uno(
            array(a.getParents()),
            (arr) => onFail(arr.length,'parents found for: '+a.getName())
          );//uno
          if(i<arr.length-1) return arr.uno(
            arr(a.getFoldersByName(x)),
            (arr) => onFail(arr.length,'folders found with name: '+x)
          );//uno
          return arr.uno(
            arr(a.getFilesByName(x)),
            (arr) => onFail(arr.length,'files found with name: '+x)
          );//uno
        },DriveApp.getRootFolder()));//mr.drive
      };//byPath
    drive.utilities = Utilities;
    drive.fileTypes = ENUM('folder','ss','doc','form','site','slide');

    drive.file = drive.File = {};

    drive.folder = drive.Folder = {};
    obj.extend(drive.folder,DriveApp.getRootFolder);//inherit from root folder
    obj.cacheables(drive.folder);//add value cacheing for simple getters
    drive.folder.isFileType = true;

    drive.ss = drive.spreadsheet = drive.Spreadsheet = {};
    obj.extend(drive.ss,SpreadsheetApp);//inherit from SpreadsheetApp
    obj.cacheables(drive.ss);//add value cacheing for simple getters
    drive.ss.isFileType = true;

    drive.sheet = drive.Sheet = {};
    obj.cacheables(drive.sheet,'active',()=>drive.ss.activeSheet);

    drive.doc = drive.document = drive.Document = {};
    obj.extend(drive.doc,DocumentApp);
    obj.cacheables(drive.doc);//add value cacheing for simple getters
    drive.doc.active = drive.doc.activeDocument;
    drive.doc.isFileType = true;

    drive.form = drive.Form = {};
    obj.extend(drive.form,FormApp);
    obj.cacheables(drive.form);//add value cacheing for simple getters
    drive.form.active = drive.form.activeForm;
    drive.form.isFileType = true;

    drive.slide = drive.presentation = drive.Slide = drive.Presentation = {};
    obj.extend(drive.slide,SlidesApp);
    obj.cacheables(drive.slide);//add value cacheing for simple getters
    drive.slide.active = drive.slide.activePresentation;
    drive.slide.isFileType = true;

    drive.site = drive.Site = {};
    obj.extend(drive.site,SitesApp);
    obj.cacheables(drive.site);//add value cacheing for simple getters
    drive.site.active = drive.site.activeSite;
    drive.site.isFileType = true;

    drive.page = drive.Page = {};
    drive.page.active = drive.site.activePage;

    obj.cacheable(drive,'active' , () => uno(loop(drive.types  , i => drive[+i].active).elems));
    obj.cacheable(drive,'files'  , () =>     loop(drive.files  , i => drive(i.elem)   ).elems) ;
    obj.cacheable(drive,'folders', () =>     loop(drive.folders, i => drive(i.elem)   ).elems) ;
    obj.cacheable(drive,'items'  , () => drive.folders.concat(drive.files));
    obj.cacheable(drive,'trashed', () => {
      const folders = loop(drive.trashFolders, i => drive(i.elem)).elems;
      const files   = loop(drive.trashFiles  , i => drive(i.elem)).elems;
      const all     = folders.concat(files);
      all.files     = files;
      all.folders   = folders;
      return all;
    });//trashed

    drive.prop = function(propName,setValue,propType='Document'){
      assert(Object.keys(drive.prop.types).filter(x=>x==propType).length);
      //log(version+' | prop('+propName+(setValue?(','+setValue):'')+')');
      if(!drive.auth) return null;
      return retry(() => {
        const propServiceName = 'get'+(string.title(propType))+'Properties';
        var propService = PropertiesService[propServiceName]();
        assert(propService);
        if(is.undefNull(propName)) return propService.getProperties();
        if(is.undefined(setValue)) return propService.getProperty(propName);
        if(!setValue) return propService.deleteProperty(propName);
        return propService.setProperty(propName,setValue);
      });//retry
    }//prop
    obj.cacheable(drive,'props',drive.prop);
    drive.prop.types = ENUM('DOCUMENT','USER','SCRIPT');
  }//else

  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  ///
  /// OPTIONAL FUNCTIONALITY
  ///
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////

  const extendPrototypes = function () {

    //TODO: give every primitive the is() and is.obj, is.arr, is.num, etc
    //TODO: use obj.extend(Number.prototype,number) to capture everything instead?

    ///
    /// NUMBER PROTOTYPE EXTENSIONS
    ///
    Object.defineProperties(Number.prototype, {
      format : { configurable: true, value: function(){return number.toString .apply(this,[this,...arguments])} },
      clamp  : { configurable: true, value: function(){return number.clamp    .apply(this,[this,...arguments])} },
      normal : { configurable: true, value: function(){return number.dist.norm.apply(this,[this,...arguments])} },
    });//defineProperties
    //assign aliases
    Number.prototype.norm = Number.prototype.gaussian = Number.prototype.bell = Number.prototype.normal;
    ///
    /// STRING PROTOTYPE EXTENSIONS
    ///
    Object.defineProperties(String.prototype, {
      left        : { configurable: true, value: function(){return string.left       .apply(this,[this,...arguments])} },
      right       : { configurable: true, value: function(){return string.right      .apply(this,[this,...arguments])} },
      mid         : { configurable: true, value: function(){return string.mid        .apply(this,[this,...arguments])} },
      insert      : { configurable: true, value: function(){return string.insert     .apply(this,[this,...arguments])} },
      count       : { configurable: true, value: function(){return string.count      .apply(this,[this,...arguments])} },
      findClosing : { configurable: true, value: function(){return string.findClosing.apply(this,[this,...arguments])} },
      has         : { configurable: true, value: function(){return string.has        .apply(this,[this,...arguments])} },
      lower       : { configurable: true, get  : function(){return string.lower            (this                    )} },
      upper       : { configurable: true, get  : function(){return string.upper            (this                    )} },
      camel       : { configurable: true, get  : function(){return string.camel            (this                    )} },
      snake       : { configurable: true, get  : function(){return string.snake            (this                    )} },
      kebab       : { configurable: true, get  : function(){return string.kebab            (this                    )} },
      pascal      : { configurable: true, get  : function(){return string.pascal           (this                    )} },
      hash        : { configurable: true, get  : function(){return string.hash             (this                    )} },
      nonblank    : { configurable: true, get  : function(){return string.nonblank         (this                    )} },
    });//defineProperties
    ///
    /// ARRAY PROTOTYPE EXTENSIONS
    ///
    Object.defineProperties(Array.prototype, {
      loop  : { configurable: true, value: function(){return loop.apply       (this,[this,...arguments])} },
      match : { configurable: true, value: function(){return array.match.apply(this,[this,...arguments])} },
      uno   : { configurable: true, get  : function(){return uno              (this                    )} },
    });//defineProperties
    ///
    /// OBJECT PROTOTYPE EXTENSIONS
    ///
    Object.defineProperties(Object.prototype, {
      clear     : { configurable: true, value: function(){return clear    .apply(this,[this,...arguments])} },
      union     : { configurable: true, value: function(){return union    .apply(this,[this,...arguments])} },
      intersect : { configurable: true, value: function(){return intersect.apply(this,[this,...arguments])} },
      subtract  : { configurable: true, value: function(){return subtract .apply(this,[this,...arguments])} },
      loop      : { configurable: true, value: function(){return loop     .apply(this,[this,...arguments])} },
    });//defineProperties
    Object.defineProperties(Object.prototype.loop, {
      //redefine these here to avoid accidental usage of {}.prototype.loop.continue instead of mr.loop.continue
      continue : { get: () => { throw loopContinue } },
      break    : { get: () => { throw loopBreak    } },
    });//defineProperties
    return scope;//for chaining
  }//extendPrototypes

  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  ///
  /// CONFIGURATIONS
  ///
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////

  const ETypes = ENUM(
    'UNKNOWN', 'UNDEF', 'NULL', 'ERROR', 'NUM', 'NAN', 'INF', 'BOOL', 'STR', 'ARR', 'FUNC', 'OBJ',
    'DATE', 'DT', 'DUR', 'INTERVAL', 'SS', 'SHEET', 'DOC', 'FORM', 'SLIDE', 'FOLDER', 'FILE',
  );//ETypes
  const EConfigs = ENUM('DEBUG', 'RELEASE');
  const EEntryTypes = ENUM('ADDON', 'WEBAPP', 'TRIGGER', 'TEST', 'UNKNOWN');

  const config = EConfigs.DEBUG;

  const entry = {
    time: luxon.DateTime.local(),
    type: EEntryTypes.UNKNOWN,
  };//entry

  log.useConsole = true;
  log.useLogger = false;

  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  ///
  /// FINALIZE MODULE
  ///
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////

  // const _mr = function (v) {
  //   //_state.value = v;
  //   //_state.type = is(v);
  //   //return is.func(_state.type) ? _state.type(v) : v;
  //   assert();
  // }//_mr

  const setterInvalid = (v) => assert();
  Object.defineProperties(/*_mr*/ scope, {
    //
    //read-only members
    //
    name: { get: () => name, set: setterInvalid },
    license: { get: () => license, set: setterInvalid },
    version: { get: () => version, set: setterInvalid },
    lang: { get: () => lang, set: setterInvalid },
    callstack: { get: () => getCallstack().display, set: setterInvalid },
    caller: { get: () => getCallstack()[1].func, set: setterInvalid },
    file: { get: () => getCallstack()[1].file, set: setterInvalid },
    line: { get: () => getCallstack()[1].line, set: setterInvalid },
    column: { get: () => getCallstack()[1].column, set: setterInvalid },
    entry: { get: () => entry, set: setterInvalid },
    now: { get: date, set: setterInvalid },
    //
    //methods
    //
    extendPrototypes: { value: extendPrototypes },
    //partial: { value: partial},
    retry: { value: retry },
    poll: { value: poll },
    profile: { value: profile },
    loop: { value: loop }, iterate: { value: loop },
    break: { get: () => loop.break },
    continue: { get: () => loop.continue }, filter: { get: () => loop.continue },
    log: { value: log },
    is: { value: is },
    swap: { value: swap },
    clone: { value: clone }, deepCopy: { value: clone },
    clear: { value: clear }, empty: { value: clear },
    union: { value: union },
    intersection: { value: intersect }, intersect: { value: intersect },
    subtraction: { value: subtract }, subtract: { value: subtract }, diff: { value: subtract },
    expectation: { value: expect }, expect: { value: expect }, uno: { value: uno },
    randomIndex: { value: randomIndex },
    shuffle: { value: shuffle }, randomize: { value: shuffle },
    sample: { value: sample },
    cartesian: { value: cartesian },
    mux: { value: mux }, multiplex: { value: mux },
    dot: { value: dot },
    cross: { value: cross },
    boolean: { value: boolean }, bool: { value: boolean },
    numbers: { value: numbers },
    number: { value: number }, num: { value: number },
    string: { value: string }, str: { value: string },
    array: { value: array }, arr: { value: array },
    object: { value: object }, obj: { value: object },
    enum: { value: ENUM },
    hourToMs: { value: hourToMs },
    minToMs: { value: minToMs },
    secToMs: { value: secToMs },
    serialNumber: { value: serial }, serial: { value: serial },
    date: { value: date },
    duration: { value: duration },
    client: { value: client },
    server: { value: server },
    drive: { value: drive },
  });//defineProperties

  // //attach mr onto the given (probably global) scope
  // Object.defineProperty(scope, 'mr', {
  //   //enumerable: true,
  //   get: () => {
  //     //_state.value = _state.type = undefined;
  //     return _mr;
  //   }//get
  //   //value: _mr,
  // });//defineProperty
  // return _mr;

  return scope;
}//mrCreate




















///*<--EOF-->*///