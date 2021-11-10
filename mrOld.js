function mrOld(){

//mr.js © 2020 Michael Wilford. All Rights Reserved.
'use strict';
function mrImport(scope=globalThis){
  const mr  = {};//everything attached to mr will get exported to global scope
  
  //things to hold at top level:
  //scope (if there is no globalThis)
  //startTime or entry
  //config
  //quotas
  //ss
  DriveApp  
  //todo:
  //override array.reduce to take 'this' pointer?
  
  mr.entry  = null;//used at every entry point to note execution start time
  mr.config = 'DEBUG';//'RELEASE';
  
  ////////////////////////////////
  ////////////////////////////////
  // Type checking
  ////////////////////////////////
  ////////////////////////////////
  
  mr.is = {};
  mr.is.undefined = mr.is.undef = function(v){return 'undefined'==typeof v}
  mr.is.defined   = mr.is.def   = function(v){return !mr.is.undefined(v)}
  mr.is.primitive = mr.is.prim  = function(v){return v!==Object(v)}
  mr.is.boolean   = mr.is.bool  = function(v){return 'boolean'==typeof v}
  mr.is.nan       = mr.is.NaN   = function(v){return Number(v)!==Number(v)}
  mr.is.finite    = mr.is.fin   = isFinite;
  mr.is.number    = mr.is.num   = function(v){return 'number'==typeof v}
  mr.is.object    = mr.is.obj   = function(v){return !!(v && typeof v==='object' && v.constructor===Object)}
  mr.is.array     = mr.is.arr   = function(v){return !!(v && typeof v==='object' && v.constructor===Array)}
  mr.is.string    = mr.is.str   = function(v){return typeof v==='string' || v instanceof String}
  mr.is.function  = mr.is.func  = function(v){return !!(v && {}.toString.call(v)==='[object Function]')}
  mr.is.date      = mr.is.Date  = function(v){return !!(v && {}.toString.call(v)==='[object Date]')}
//mr.is.numeric                 = function(v){return !mr.is.nan(parseFloat(v)) && isFinite(v)}//use isFinite instead
  
  ////////////////////////////////
  ////////////////////////////////
  // Type conversions
  ////////////////////////////////
  ////////////////////////////////
  
  mr.as = {};
  
  /**
   * Interpret the given value as boolean.
   * as.boolean(v,stringOptions)
   * @param {*} v - Any variable to be converted to boolean.
   * @param {{trueStrings,isCaseSensitive}} stringOptions - Options for how to treat strings as true.
   * @param {undefined|[string]} trueStrings - List of strings to treat as boolean true, defaults to ['true','✔'].
   * @param {undefined|boolean} isCaseSensitive - Whether to treat trueStrings as case-sensitive, defaults to false.
   * @return {boolean}
   */
  mr.as.boolean = mr.as.bool = function(v,{trueStrings=['true','✔'],isCaseSensitive=false}={}){
    const vCompare = isCaseSensitive ? v.trim : v.trim.lower;
    if(mr.is.str(v)) return !!trueStrings.filter((x)=>
      vCompare===isCaseSensitive ? x.trim : x.trim.lower
    ).length;
    return !!v;
  }//as.boolean
  
  /**
   * as.date(v) - Convert the given value into a date.
   * @param v : * - Any variable to be converted to a date.
   * @return Date
   */
  mr.as.date = function(v){return new Date(v)}

  /**
   * as.array(v) - Convert the given value into an array.
   * @param v : * - Any variable to be converted to boolean. If an iterator, items will be extracted.
   * @return [*]
   */
  mr.as.array = mr.as.arr = function(v){
    if(!mr.is.func(v.hasNext)) return Array.from(v);
    let array = [];
    while(v.hasNext()) array.push(v.next());
    return array;
  }//as.array

  /**
   * as.numbers(v) - Finds all the numbers in the given string.
   * @param v : string
   * @return [number]
   */
  mr.as.numbers = mr.as.nums = function(v){
    if(mr.is.fin(v)) return [1*v];
    if(mr.is.str(v)) return v.match(/(\d+\.|\d+)+/g);
    if(mr.is.obj(v)) v = getObjectValues(v);//make into an array
    let result = [];
    v.forEach(x=>result = result.concat(mr.as.nums(x)),this);
    return result;
  }//as.numbers
  
  /**
   * as.serialNumber(d) - Convert the given date to a serial number for google sheets.
   * @param d : Date
   * @return number
   */
  mr.as.serialNumber = mr.as.serialNum = mr.as.serial = function(d){
    d = mr.as.date(d) || new Date();
    const minSerial = new Date(Date.UTC(1899,11,30,0,0,0,0));//starting value for google serial number date
    return ((d.getTime()-minSerial.getTime())/60000-d.getTimezoneOffset())/1440;
  }//as.serialNumber
  
  ////////////////////////////////
  ////////////////////////////////
  // Javascript utilities
  ////////////////////////////////
  ////////////////////////////////
  
  /**
   * makeEnum(...values)
   * @param values : [string]
   * @return Object
   */
  mr.makeEnum = function(...values){
    const enumValues = values.map((x)=>(Object.freeze({[x]:x})));
    return Object.freeze(Object.assign({},...enumValues));
  }//makeEnum

  /**
   * assert(test,onFail)
   * @param test : * - Anything that can be tested for true/false.
   * @param onFail : undefined|function|string - Callback to run when test fails, or an error msg to display, defaults to 'assert failed'.
   * @example assert(myArray.length,'Array is empty!')
   * @return * - The result of onFail() if it is a function, otherwise the boolean value of test.
   */
  mr.assert = function(test=null,onFail='assert failed: '+test){
    if(test) return true;
    if(mr.is.func(onFail)) return onFail(mr.as.arr(arguments));
    throw new Error(onFail);
  }//assert

  /**
   * partial({func,thisArg,args})
   * @param func : function - The function to build the partial wrapper for.
   * @param thisArg : undefined|Object - The context to execute the given function under.
   * @param args : undefined|[*] - Array of arguments to be pre-loaded into the partial function call, defaults to [].
   * @return * - Whatever the given func returns.
   */
  mr.partial = function({func,thisArg,args=[]}){
    return function(...partialArgs){
      const allArgs = [...args,...partialArgs];
      const f = mr.is.func(func) ? func : thisArg[func];//allow string names of functions
      return f.apply(thisArg,allArgs);
    };//function
  }//partial
  
  /**
   * define(obj,propName,{...descriptor})
   * @param obj : Object - Target object to define new properties on.
   * @param propName : string|[string] - Property name, or array of names, to define.
   * @param descriptor : {value|get|set,configurable=true,...rest} - Description options for Object.defineProperty().
   * @param descriptor.value : undefined|* - If you want this property to be of type value then provide the property as a value.
   * @param descriptor.get : undefined|* - If you want this property to be of type get then provide the property as a getter.
   * @param descriptor.set : undefined|* - If you want this property to be of type set then provide the property as a setter.
   * @param descriptor.configurable : undefined|boolean - Whether this property should be able to be modified later, defaults to true.
   * @param descriptor.rest : * - Other parameters for Object.defineProperty such as enumerable, writable, etc.
   */
  mr.define = mr.def = function(obj,propName,descriptor){
    if(mr.is.undef(descriptor.configurable)) descriptor.configurable = true;
    const names = mr.is.arr(propName) ? propName : [propName];
    names.forEach(x=>Object.defineProperty(obj,x,descriptor));
  }//define
  
  /**
   * profile(func,desc,thisArg) - Measure how long the given function takes to execute.
   * @param func : function - Code to measure.
   * @param desc : string - Message to print along with performance metrics, defaults to _caller+'.'+func.name
   * @param thisArg : Object - Context to execute func with.
   * @return * - Result of func.
   */
  mr.profile = function(func,desc=_caller+'.'+func.name,thisArg){
    const start = Date.now();
    const result = func.call(thisArg);
    mr.log.info(duration(start).ms+'ms to complete: '+desc);
    return result;
  }//profile
  
  /**
   * tryFail(funcTry,funcFail) - Try to run one function and if it fails run the other.
   * @param funcTry : function
   * @param funcFail : function
   * @return * - Result of the function that runs.
   */
  mr.tryFail = function(funcTry,funcFail){try{return funcTry()}catch(err){return funcFail(err)}}
  
  /**
   * retry({funcTry,num,wait,check,thisArg}) - Attempt to run a function several times.
   * @param funcTry : function - The code to attempt.
   * @param num : undefined|number - Number of tries to attempt, defaults to 4.
   * @param wait : undefined|number - Number of milliseconds to wait between attempts, defaults to 100.
   * @param check : undefined|function - Callback function that can check state after an attempt to determine if more attempts should be tried.
   * @param thisArg : Object - Context to run the funcTry with.
   * @return * - Result of funcTry.
   */
  mr.retry = function({funcTry,num=4,wait=100,check,thisArg}){
    if(!mr.is.func(funcTry)) return mr.log.error('retry: invalid function provided: '+funcTry);
    let result,success = false;
    let attempt = 1;
    while(attempt<num){
      try{
        result = funcTry.call(thisArg,attempt);//sometimes fails
        success = true;
        break;
      }catch(err){
        if(mr.is.func(check) && !check.call(thisArg,attempt,err)) throw err;
        mr.log.warn('retry: attempt number '+attempt+' of '+num+' has failed:\n'+err.message);
        Utilities.sleep(wait);//wait before trying again
        ++attempt;
      }//catch
    }//while
    if(!success) result = funcTry.call(thisArg,attempt);//one last try and let the error happen
    return result;
  }//retry

  /**
   * poll({func,allowed,checkEvery,thisArg}) - Run the given function periodically until time runs out or the function returns true.
   * @param func : function - Code to run periodically.
   * @param allowed : number - Number of milliseconds to allow the function to be run; defaults to Infinity.
   * @param runEvery : number - Number of milliseconds to wait between executions; defaults to 100ms.
   * @param thisArg : * - Context to execute the function with.
   * @return boolean - True if the function returns true, false if poll() finishes because time ran out.
   */
  mr.poll = function({func,allowed=Infinity,runEvery=100,thisArg}){
    const pollStart = Date.now();
    while(true){
      if(func.call(thisArg)) return true;
      if(allowed<duration(pollStart).ms) break;
      if(mr.is.def(startTime) && drive.warningRuntime<duration(startTime).ms) break;
      log('poll: sleep for '+runEvery+'ms');
      Utilities.sleep(runEvery);
    }//while
    return false;
  }//poll
  
  /**
   * duration(start,end) - Calculate the duration between two times.
   * @param start : number - A start time represented by the number of milliseconds from midnight 1/1/1970, as found by Date.getTime().
   * @param end : undefined|number - An end time, defaults to Date.now().
   * @return {milliseconds,seconds,minutes,hours,days,weeks,description} - Object with 
   */
  mr.duration = function(start=mr.entry,end=Date.now()){
    let result = {};
    mr.define(result,['milliseconds','milli','ms'],{get:()=>end-start});
    mr.define(result,[     'seconds', 'secs', 's'],{get:()=>Math.floor(result.ms/1000)});
    mr.define(result,[     'minutes', 'mins', 'm'],{get:()=>Math.floor(result.s/60)});
    mr.define(result,[       'hours',  'hrs', 'h'],{get:()=>Math.floor(result.m/60)});
    mr.define(result,[        'days',         'd'],{get:()=>Math.floor(result.h/24)});
    mr.define(result,[       'weeks',  'wks', 'w'],{get:()=>Math.floor(result.d/7)});
    mr.define(result,[       'years',  'yrs', 'y'],{get:()=>mr.as.date(end).getFullYear() - mr.as.date(start).getFullYear()});
    mr.define(result,[      'months',  'mos', 'M'],{get:()=>Math.max(0,12*result.y + mr.as.date(start).getMonth() + 1 + mr.as.date(end).getMonth())});
    mr.define(result,[     'decades'             ],{get:()=>Math.floor(result.y/10)});
    mr.define(result,[ 'description', 'desc'     ],{get:()=>{
      const ms = result.ms - result.s*1000;
      const  s = result.s  - result.m*60;
      const  f = (s + ms/1000).toFixed(2);//secs with fraction
      const  m = result.m  - result.h*60;
      const  h = result.h  - result.d*24;
      const  d = result.d  - result.w*7;
      const  w = result.w;
      return (w?w+'w ':'')+(d?d+'d ':'')+(h?h+'h ':'')+(m?m+'m ':'')+(f?f+'s ':'');
    }});//description
    return result;
  }//duration
  
  /**
   * loremIpsum - First use will make a UrlFetch to get some lorem ipsum placeholder text and cache it; subsequent use gets the cached result.
   * getLoremIpsum(url,...options) - Always make a UrlFetch to get some lorem ipsum placeholder text and caches it as 'loremIpsum'.
   * @param url : string - URL to get the lorem ipsum from, defaults to 'https://loripsum.net/api/'.
   * @param options : [*] - Options to provide to the given url, defaults to [1,'short','plaintext'].
   * @return string
   */
  mr.getLoremIpsum = function(url='https://loripsum.net/api/',...options){
    if(!options.length) options = [1,'short','plaintext'];//defaults
    options.forEach(x=>url+=x+'/',this);
    const loremIpsum = UrlFetchApp.fetch(url).getContentText();
    mr.define(mr,'loremIpsum',{value:loremIpsum});//cache it
    return loremIpsum;
  };mr.define(mr,'loremIpsum',{getter:mr.getLoremIpsum});

  /**
   * colAsLetter(column,headings) - Convert the given column reference into a column letter.
   * @param column : reference | colNumber | colHeading
   * @param reference : {letter:string | number:number | heading:string}
   * @param colNumber : number - Column number, starting with 1.
   * @param colHeading : string - Value of first row in column.
   * @param headings : undefined | [string] - Column headings to search through, necessary if column is given as a heading.
   * @return string - Column letter in absolute A1 notation, must begin with $.
   */
  mr.colToLetter = function(column,headings=[]){
    if(mr.is.obj(column)) column = column.letter || column.number || column.heading;
    if(mr.is.num(column)){
      mr.assert(0<column,'colToLetter: Invalid column number');
      let temp,letter = '';
      while(0<column){
        temp = (column - 1) % 26;
        letter = String.fromCharCode(temp + 'A'.charCodeAt(0)) + letter;
        column = (column - temp - 1) / 26;
      }//while
      return '$'+letter;
    }else if(mr.is.str(column)){
      if('$'===column[0]) return column;//no conversion necessary
      const matches = headings.filterIndex(x => x.trim.lower===column.trim.lower);
      let i = matches.length && matches.uno() || -1;
      mr.assert(0<=i,'colAsLetter('+column+'): Failed to find heading!');
      return mr.colToLetter(i+1);//convert to column number (starting at 1)
    }//if
    throw new Error('Unexpected type for column designation: '+JSON.stringify(column)+'('+typeof column+')');
  }//colAsLetter
  
  /**
   * colAsNumber(column,headings) - Convert the given column reference into a column number.
   * @param {reference|letter|heading} column
   * @param {{letter|number|heading}} reference
   * @param {string} letter - Column letter in absolute A1 notation, must start with $.
   * @param {number} number - Column number (starting from 1).
   * @param {string} heading - Value of first row in column.
   * @param {undefined|[string]} headings - Column headings to search through, necessary if reference is a heading.
   * @return {string} - Column number, starting with 1.
   */
  mr.colAsNumber = function(column,headings=[]){
    if(mr.is.obj(column)) column = column.number || column.letter || column.heading;
    if(mr.is.num(column) && 0<column) return column;//no conversion necessary
    else if(mr.is.str(column)){
      if('$'===column[0]){
        let num = 0;
        for(let i=0;i<column.length;++i){
          num += (column.charCodeAt(i) - ('A'.charCodeAt(0)-1)) * Math.pow(26,column.length - i - 1);
        }//for
        return num;
      }//if
      const matches = headings.filterIndex(x => x.trim.lower===column.trim.lower);
      let i = matches.length && matches.uno() || -1;
      mr.assert(0<=i,'colAsLetter('+column+'): Failed to find heading!');
      return i+1;//convert to column number (starting at 1)
    }//if
    throw new Error('Unexpected type for column designation: '+typeof reference);
  }//colAsNumber

  /**
   * _callstack - Gets the current callstack as an array of strings.
   * @return {[string]}
   */
  mr.define(mr,'_callstack',{getter:function(){
    try{throw new Error('!')}
    catch(err){
      const display = err.stack.right(err.stack.indexOf('\n')+1);
      let matches = display.split(/\s*at /g);
      matches.shift();//first element is blank
      matches.shift();//next element is this getCallStack
      matches.pop();//last element in V8 is always: "__GS_INTERNAL_top_function_call__.gs:1:8"
      matches = matches.map(function(x,i){
        return { //e.g: "test (mr:1824:3)"
          func : x.left(x.indexOf(' (')),
          file : x.mid(x.indexOf('(')+1,x.indexOf(':',x.indexOf('('))),
          line : parseFloats(x.right(x.indexOf('(')))[0],
          col  : parseFloats(x.right(x.indexOf('(')))[1]
        };//return
      },this);//map
      matches.display = display;
      return matches;
    }//catch
  }});//define
  
  mr.define(mr,'_caller',{getter:()=> mr._callstack[1].func});//_caller - Get the caller function name.
  mr.define(mr,'_line'  ,{getter:()=> mr._callstack[1].line});//_line - Get the line number of a line of code.
  mr.define(mr,'_file'  ,{getter:()=> mr._callstack[1].file});//_file - Get the file name of a script.
  
  ////////////////////////////////
  ////////////////////////////////
  // Logging
  ////////////////////////////////
  ////////////////////////////////
  
  mr.log       = function(msg){ if('RELEASE'!=mr.config && mr.log.useLogger) Logger.log(               msg); if('RELEASE'!=mr.config && mr.log.useConsole) console.log  (msg); return msg; }
  mr.log.info  = function(msg){ if('RELEASE'!=mr.config && mr.log.useLogger) Logger.log('*INFO* '     +msg); if('RELEASE'!=mr.config && mr.log.useConsole) console.info (msg); return msg; }
  mr.log.warn  = function(msg){ if('RELEASE'!=mr.config && mr.log.useLogger) Logger.log('**WARNING** '+msg); if('RELEASE'!=mr.config && mr.log.useConsole) console.warn (msg); return msg; }
  mr.log.error = function(msg){ if('RELEASE'!=mr.config && mr.log.useLogger) Logger.log('***ERROR*** '+msg); if('RELEASE'!=mr.config && mr.log.useConsole) console.error(msg); return msg; }
  mr.log.useLogger  = false;
  mr.log.useConsole = true;
  
  ////////////////////////////////
  ////////////////////////////////
  // Random number generator
  ////////////////////////////////
  ////////////////////////////////
  
  /**
   * rng() - Generate a psuedo random number [0,1). Seed can optionally be set beforehand via rng.seed(seed).
   *         Calls the Wichmann-Hill implementation but we could easily point to others here.
   * @return number - In the range [0,1)
   */
  mr.rng = mr.prng = mr.rand = mr.random = mr.partial({func:()=>mr.rng.wichmannHill()});
  
  /**
   * rng.seed(seed) - Seed our psuedo random number generator for deterministic results.
   *                  Calls the Wichmann-Hill implementation but we could easily point to others here.
   * @param seed : number - Seed for the pseudo random number generator; defaults to Date.now().
   */
  mr.rng.seed = mr.partial({func:(seed)=>mr.rng.wichmannHill.seed(seed)});
  
  /**
   * rng.wichmannHill(seed) - Generate a uniformly distributed pseudo random number between [0.0, 1.0) using the Wichmann–Hill algorithm.
   * @param seed : undefined|number - Optional seed, defaults to whatever was set before, or Date.now().
   * @return number
   */
  mr.rng.wichmannHill = function(){
    if(mr.is.undef(mr.rng.wichmannHill.seed._curr)) mr.rng.wichmannHill.seed();//ensure we have at least the default seed
    mr.rng.wichmannHill.seed.x = (171 * mr.rng.wichmannHill.seed.x) % 30269;
    mr.rng.wichmannHill.seed.y = (172 * mr.rng.wichmannHill.seed.y) % 30307;
    mr.rng.wichmannHill.seed.z = (170 * mr.rng.wichmannHill.seed.z) % 30323;
    return ( mr.rng.wichmannHill.seed.x/30269.0 + 
             mr.rng.wichmannHill.seed.y/30307.0 + 
             mr.rng.wichmannHill.seed.z/30323.0
           ) % 1.0;
  }//rng.wichmannHill
  
  /**
   * rng.wichmannHill.seed(seed) - Set the seed for our random number generator.
   * @param seed : undefined|number - Optional seed, defaults to whatever was set before, or Date.now().
   */
  mr.rng.wichmannHill.seed = function(seed){
    //do we need a new seed?
    if(mr.is.def(mr.rng.wichmannHill.seed._curr) && mr.is.undef(mr.rng.wichmannHill.seed._orig)) mr.rng.wichmannHill.seed._orig = mr.rng.wichmannHill.seed._curr;
    if(mr.is.def(seed)){
      seed = mr.as.nums(seed).uno();//allow string containing a number
      if(seed!==mr.rng.wichmannHill.seed._orig) mr.rng.wichmannHill.seed._orig = mr.rng.wichmannHill.seed._curr = seed;
    }else if(mr.is.undef(mr.rng.wichmannHill.seed._curr)){
      mr.rng.wichmannHill.seed._orig = mr.rng.wichmannHill.seed._curr = Date.now();
    }//if
    //do we need to initialize our seed?
    if(mr.rng.wichmannHill.seed._curr===mr.rng.wichmannHill.seed._orig){
      mr.rng.wichmannHill.seed.x = (mr.rng.wichmannHill.seed._curr % 30268) + 1;
      mr.rng.wichmannHill.seed._curr = (mr.rng.wichmannHill.seed._curr - (mr.rng.wichmannHill.seed._curr % 30268)) / 30268;
      mr.rng.wichmannHill.seed.y = (mr.rng.wichmannHill.seed._curr % 30306) + 1;
      mr.rng.wichmannHill.seed._curr = (mr.rng.wichmannHill.seed._curr - (mr.rng.wichmannHill.seed._curr % 30306)) / 30306;
      mr.rng.wichmannHill.seed.z = (mr.rng.wichmannHill.seed._curr % 30322) + 1;
      mr.rng.wichmannHill.seed._curr = (mr.rng.wichmannHill.seed._curr - (mr.rng.wichmannHill.seed._curr % 30322)) / 30322;
    }//if
  }//wichmannHill.seed
  
  /**
   * rng.int({min,max,exclude}}) - Generate a random integer [min,max) excluding the given values.
   * @param {number} min - Minimum allowable integer, defaults to 0.
   * @param {number} max - Maximum allowable integer up to but excluding this number, defaults to 100.
   * @param {[number]} exclude - List of numbers to exclude, defaults to empty [].
   * @return {number}
   */
  mr.rng.int = mr.rng.integer = mr.rng.between = function({min=0,max=100,exclude=[]}={}){
    let range = [];
    for(let i=Math.ceil(min);i<Math.floor(max);++i){
      if(!exclude.has(i)) range.push(i);
    }//for
    mr.assert(range.length,'rng.int: no valid options between '+min+' and '+max);
    const randIndex = Math.floor(mr.rng()*((range.length-1) - 0 + 1)) + 0;
    return range[randIndex];
  }//rng.int
  
  ////////////////////////////////
  ////////////////////////////////
  // drive
  ////////////////////////////////
  ////////////////////////////////
  
  mr.drive                = {};
  mr.drive.isAuthorized   = true;//always assume we're authorized unless we know we're not
  mr.drive.maxRuntime     = 6*60*1000;//6m for Google Consumer accounts (30m for Google EDU accounts)
  mr.drive.warningRuntime = mr.drive.maxRuntime - (2*60*1000);//6m-2m=4m
  
  //settings that users of this mr lib can modify to suit their purposes
  //mr.drive.settings			   = {};
  //mr.drive.settings.blockLocks   = true;//default value
  
  /**
   * Send an email to someone.
   * drive.email( to, cc, bcc, from, subject, body, isTest )
   * @param to : string
   * @param cc : string
   * @param bcc : undefined|string|[string] - Can be a comma-delimited string or an array of strings, defaults to whatever is set to drive.settings.bccEmails.
   * @param from : undefined|{name,email,noReply} - Sender's display name and reply-to email address, defaults to active user.
   * @param from.name : undefined|string - Name to display as the sender, defaults to active user's regular display.
   * @param from.email : undefined|string - Reply-to email address, defaults to active user's email.
   * @param from.noReply : undefined|boolean - True to prevent reply emails, defaults to false.
   * @param subject : string
   * @param body : string - Can be in HTML.
   * @param isTest : undefined|boolean - Defaults to false;
   * @return boolean - True if email was sent (or if isTest is true); otherwise false.
   */
  mr.drive.email = function({to,cc,bcc=mr.drive.bccAllEmails,from={noReply:true,name:'AUTOMATED EMAILER',email:Session.getActiveUser().getEmail()},subject='',body,isTest=false}){
    if(mr.drive.onlyEmailSelf) to = cc = bcc = Session.getActiveUser().getEmail();
    if(mr.is.arr( to))  to =  to.toString();//comma-delimmitted
    if(mr.is.arr( cc))  cc =  cc.toString();//comma-delimmitted
    if(mr.is.arr(bcc)) bcc = bcc.toString();//comma-delimmitted
    log('<'+from+'> emailing <'+to+'> re: '+subject);
    if(isTest) return log('Testing email:\n\t\tFrom:\t\t'+from+'\n\t\tTo:\t\t'+to+'\n\t\tCc:\t\t'+cc+'\n\t\tBcc:\t\t'+bcc+'\t\tSubject:\t'+subject+'\n\t\tBody:\t\t'+body);
    if(drive.blockAllEmails) return log('Email blocked by the "Block all emails" setting');
    const options = {cc:cc, bcc:bcc, body:body, name:from.name, email:from.email, noReply:from.noReply};
    try{
      return MailApp.sendEmail(to,subject,null,options);//~70ms
    }catch(e){
      const mailQuota = mr.profile(function(){return MailApp.getRemainingDailyQuota()},'getQuota');
      log('MailApp.sendEmail() FAILED! (quota: '+mailQuota+')');
      throw new Error('Failed to send email from <'+from.email+'> to <'+to+'> re: '+subject);
    }//catch
  }//email
  
  /**
   * drive.ui - First use will get the ui api and cache it; subsequent use gets the cached result.
   * drive.getUI() - Always gets the ui api and caches it as 'ui'.
   * @return Object
   */
  mr.drive.getUI = mr.drive.getUi = function(){
    let ui;
    if(  SpreadsheetApp.getActiveSpreadsheet ()) ui = SpreadsheetApp.getUi();
    else if(DocumentApp.getActiveDocument    ()) ui =    DocumentApp.getUi();
    else if(  SlidesApp.getActivePresentation()) ui =      SlidesApp.getUi();
    else if(    FormApp.getActiveForm        ()) ui =        FormApp.getUi();
    else throw new Error('getUI: Unexpected UI type');
    mr.define(mr.drive,'ui',{value:ui});
    return ui;
  };mr.define(mr.drive,'ui',{getter:mr.drive.getUI});
  
  /**
   * drive.alert(title,prompt,buttons)
   * @param title : undefined|string - Dialog title at the top, defaults to 'Please confirm'.
   * @param prompt : undefined|string - Dialog message, defaults to 'Are you sure you want to continue?'.
   * @param buttons : undefined|ButtonSet|string - Buttons on the dialog box, defaults to 'OK'.
   * @return null|ButtonSet|string - The button the user clicked, or null if the dialog failed to show.
   */
  mr.drive.alert = function({title='Please confirm',prompt='Are you sure you want to continue?',buttons='OK'}={}){
    if('RELEASE'==config) return null;
    return mr.drive.ui.alert(title,prompt,drive.ui.ButtonSet[buttons]);
  }//alert
  
  //////////////////////////////////////////////
  //////////////////////////////////////////////
  // drive.file
  //////////////////////////////////////////////
  //////////////////////////////////////////////
  
  /**
   * new drive.file( _file | id ) - Construct a drive.file object.
   * @param _file {File} - The google drive file object to base this new drive.file on.
   * @param id {string} - The unique id of the file to base this new drive.file on.
   * @return {drive.file}
   */
  mr.drive.file = function(_file){
    mr.assert(new.target,'mr.drive.file must be called with new');
    const _id = mr.is.obj(_file) ? _file.getId() : _file;
    //first look in the cache
    if(!mr.drive.file.cache) mr.drive.file.cache = {};
    if(mr.drive.file.cache[_id]) return mr.drive.file.cache[_id];//cache hit
    //cache miss, so make a new one
    _file = mr.is.obj(_file) && _file || DriveApp.getFileById(_id);
    Object.defineProperty(this,'_file',{value:_file});//make our private member public but read-only
    for(let x in _file) this[x] = mr.is.func(_file[x]) ? mr.partial({thisArg:_file,func:x}) : _file[x];//inherit from base
    //add new file to cache
    return mr.drive.file.cache[_id] = this;
  }//drive.file

  /**
   * file.type - First use will get the mime type and cache it; subsequent use gets the cached result.
   * file.getType() - Always gets the current mime type and caches it as 'type'.
   * @return {string}
   */
  mr.drive.file.prototype.getMimeType = mr.drive.file.prototype.getType = function(){
    const type = this._file.getMimeType();
    mr.define(this,'type',{value:type});//cache it
    return type;
  };mr.define(mr.drive.file.prototype,'type',{getter:mr.drive.file.prototype.getType});
  
  /**
   * file.id - First use will get the id and cache it; subsequent uses gets the cached result.
   * file.getId() - Always gets the current id and caches it as 'id'.
   * @return {string}
   */
  mr.drive.file.prototype.getId = function(){
    const id = this._file.getId();
    mr.define(this,'id',{value:id});//cache it
    return id;
  };mr.define(mr.drive.file.prototype,'id',{getter:mr.drive.file.prototype.getId});
  
  /**
   * file.url - First use will get the url and cache it; subsequent uses gets the cached result.
   * file.getUrl() - Always gets the current url and caches it as 'url'.
   * @return {string}
   */
  mr.drive.file.prototype.getUrl = function(){
    const url = this._file.getUrl();
    mr.define(this,'url',{value:url});//cache it
    return url;
  };mr.define(mr.drive.file.prototype,'url',{getter:mr.drive.file.prototype.getUrl});
  
  /**
   * file.name - First use will get the name and cache it; subsequent uses gets the cached result.
   * file.getName() - Always gets the current name and caches it as 'name'.
   * @return {string}
   */
  mr.drive.file.prototype.getName = function(){
    const name = this._file.getName();
    mr.define(this,'name',{value:name});//cache it
    return name;
  };mr.define(mr.drive.file.prototype,'name',{getter:mr.drive.file.prototype.getName});
  
  /**
   * file.link - First use will get the download url and cache it; subsequent uses gets the cached result.
   * file.getLink() - Always gets the current download url and caches it as 'link'.
   * @return {string}
   */
  mr.drive.file.prototype.getDownloadUrl = mr.drive.file.prototype.getLink = function(){
    const link = this._file.getDownloadUrl();
    mr.define(this,['downloadUrl','link'],{value:link});//cache it
    return link;
  };mr.define(mr.drive.file.prototype,['downloadUrl','link'],{getter:mr.drive.file.prototype.getLink});
  
  /**
   * file.size - First use will get the size and cache it; subsequent uses gets the cached result.
   * file.getSize() - Always gets the current size and caches it as 'size'.
   * @return {number}
   */
  mr.drive.file.prototype.getSize = function(){
    const size = this._file.getSize();
    mr.define(this,'size',{value:size});//cache it
    return size;
  };mr.define(mr.drive.file.prototype,'size',{getter:mr.drive.file.prototype.getSize});
  
  /**
   * file.desc - First use will get the description and cache it; subsequent uses gets the cached result.
   * file.getDesc() - Always gets the current description and caches it as 'desc'.
   * @return {string}
   */
  mr.drive.file.prototype.getDescription = mr.drive.file.prototype.getDesc = function(){
    const desc = this._file.getDescription();
    mr.define(this,['description','desc'],{value:desc});//cache it
    return desc;
  };mr.define(mr.drive.file.prototype,['description','desc'],{getter:mr.drive.file.prototype.getDesc});
  
  /**
   * file.created - First use will get the date created and cache it; subsequent uses gets the cached result.
   * file.getCreated() - Always gets the current date created and caches it as 'created'.
   * @return {Date}
   */
  mr.drive.file.prototype.getDateCreated = mr.drive.file.prototype.getCreated = function(){
    const created = this._file.getDateCreated();
    mr.define(this,['dateCreated','created'],{value:created});//cache it
    return created;
  };mr.define(mr.drive.file.prototype,['dateCreated','created'],{getter:mr.drive.file.prototype.getCreated});
  
  /**
   * file.updated - First use will get the last updated date and cache it; subsequent uses gets the cached result.
   * file.getUpdated() - Always gets the current last updated date and caches it as 'updated'.
   * @return {Date}
   */
  mr.drive.file.prototype.getLastUpdated = mr.drive.file.prototype.getUpdated = function(){
    const updated = this._file.getLastUpdated();
    mr.define(this,['lastUpdated','updated'],{value:updated});//cache it
    return updated;
  };mr.define(mr.drive.file.prototype,['lastUpdated','updated'],{getter:mr.drive.file.prototype.getUpdated});
  
  /**
   * file.sharing - First use will get the sharing options and cache it; subsequent uses gets the cached result.
   * file.getSharing() - Always gets the current sharing options and caches it as 'sharing'.
   * @return {Object}
   */
  mr.drive.file.prototype.getSharing = function(){
    const sharing = {
      access     : this._file.getSharingAccess(),
      permission : this._file.getSharingPermission()
    };//sharing
    mr.define(this,'sharing',{value:sharing});//cache it
    return sharing;
  };mr.define(mr.drive.file.prototype,'sharing',{getter:mr.drive.file.prototype.getSharing});
  
  /**
   * file.parents - First use will get the parents and cache it; subsequent uses gets the cached result.
   * file.getParents() - Always gets the current parents and caches it as 'parents'.
   * @return {[drive.folder]}
   */
  mr.drive.file.prototype.getParents = function(){
    const parents = mr.as.arr(this._file.getParents()).map(x=>new (mr.drive.getFileConstructor(x))(x));
    mr.define(this,'parents',{value:parents});//cache it
    return parents;
  };mr.define(mr.drive.file.prototype,'parents',{getter:mr.drive.file.prototype.getParents});
  
  /**
   * file.prop(propName,setValue) - Get all the properties, or a specific property by name and set it if a new value is provided.
   * @param propName {undefined|string} - Optinal name of a property; or nothing to get all properties.
   * @param setValue {undefined|null|string} - Optional value to set, or null to delete the property.
   * @return {Object|string|null} - Object containing all the properties, or a string value for a single property, or null when setting / deleting a property.
   */
  mr.drive.file.prototype.property = mr.drive.file.prototype.prop = function(propName,setValue){
    if(false===drive.isAuthorized) return log.error('ss.prop: not yet authorized!');
    const propService = PropertiesService.getDocumentProperties();
    if(mr.is.undef(propName)) return propService.getProperties();
    if(mr.is.undef(setValue)) return propService.getProperty(propName);
    if(null===setValue) return propService.deleteProperty(propName) && null;
    return propService.setProperty(propName,setValue) && null;
  }//prop
  
  //////////////////////////////////////////////
  //////////////////////////////////////////////
  // drive.folder
  //////////////////////////////////////////////
  //////////////////////////////////////////////
  
  /**
   * new drive.folder( _folder ) - Construct a drive.folder object.
   * @param _folder {Folder} - The google drive folder object to base this new drive.folder on.
   * @return {drive.folder}
   */
  mr.drive.folder = function(_folder){
    mr.assert(new.target,'mr.drive.folder must be called with new');
    const _id = mr.is.obj(_folder) ? _folder.getId() : _folder;
    //first look in the cache
    if(!mr.drive.folder.cache) mr.drive.folder.cache = {};
    if(mr.drive.folder.cache[_id]) return mr.drive.folder.cache[_id];//cache hit
    //cache miss, so make a new one
    _folder = mr.is.obj(_folder) && _folder || tryFail(
      ()=>DriveApp.getFolderById(_id), //try
      ()=>DriveApp.getRootFolder()     //fail
    );//tryFail
    Object.defineProperty(this,'_folder',{value:_folder});//make our private member public but read-only
    for(let x in _folder) this[x] = mr.is.func(_folder[x]) ? partial({thisArg:_folder,func:x}) : _folder[x];//inherit from base
    //add new folder to cache
    return mr.drive.folder.cache[_id] = this;
  }//drive.folder

  /**
   * folder.files - First use will fetch the folder's files and cache it; subsequent uses gets the cached result.
   * folder.getFiles() - Always gets the current files and caches it as 'files'.
   * @return {[drive.file]}
   */
  mr.drive.folder.prototype.getFiles = function(){
    const files = mr.as.arr(this._folder.getFiles()).map(x=>new (mr.drive.getFileConstructor(x))(x));
    mr.define(this,'files',{value:files});//cache it
    return files;
  };mr.define(mr.drive.folder.prototype,'files',{getter:mr.drive.folder.prototype.getFiles});
  
  /**
   * folder.folders - First use will fetch the folder's folders and cache it; subsequent uses gets the cached result.
   * folder.getFolders() - Always gets the current folders and caches it as 'folders'.
   * @return {[drive.folder]}
   */
  mr.drive.folder.prototype.getFolders = function(){
    const folders = mr.as.arr(this._folder.getFolders()).map(x=>new mr.drive.folder(x));
    mr.define(this,'folders',{value:folders});//cache it
    return folders;
  };mr.define(mr.drive.folder.prototype,'folders',{getter:mr.drive.folder.prototype.getFolders});
  
  //////////////////////////////////////////////
  //////////////////////////////////////////////
  // drive.ss
  //////////////////////////////////////////////
  //////////////////////////////////////////////

  /**
   * new drive.ss( _ss ) - Construct a ss object.
   * @param _ss {Spreadsheet} - The google drive spreadsheet object to base this drive.ss on.
   * @return {Object}
   */
  mr.drive.ss = function(_ss){
    mr.assert(new.target,'mr.drive.ss must be called with new');
    const _id = mr.is.obj(_ss) ? _ss.getId() : _ss;
    //first look in the cache
    if(!mr.drive.ss.cache) mr.drive.ss.cache = {};
    if(mr.drive.ss.cache[_id]) return mr.drive.ss.cache[_id];//cache hit
    //cache miss, so make a new one
    mr.log('making new ss');
    _ss = mr.is.obj(_ss) && _ss || SpreadsheetApp.openById(_id);
    mr.drive.file.call(this,_id);//base class
    Object.defineProperty(this,'_ss',{value:_ss});//make our private member public but read-only
    for(let x in _ss) this[x] = mr.is.func(_ss[x]) ? partial({thisArg:_ss,func:x}) : _ss[x];//inherit from base
    //add new ss to cache
    return mr.drive.ss.cache[_id] = this;
  };mr.drive.ss.prototype = Object.create(mr.drive.file.prototype);
  
  /**
   * drive.ss.active - First use will get the active spreadsheet and cache it; subsequent uses gets the cached result.
   * drive.ss.getActive() - Always gets the current active spreadsheet and caches it as 'active'.
   * @return {drive.ss}
   */
  mr.drive.ss.getActive = function(){
    const active = new mr.drive.ss(SpreadsheetApp.getActive());
    mr.define(mr.drive.ss,'active',{value:active});//cache it
    return active;
  };mr.define(mr.drive.ss,'active',{getter:mr.drive.ss.getActive});
  
  /**
   * ss.sheets - First use will get the sheets and cache it; subsequent uses gets the cached result.
   * ss.getSheets() - Always gets the current sheets and caches it as 'sheets'.
   * @return {[drive.ss.sheet]}
   */
  mr.drive.ss.prototype.getSheets = function(){
    const sheetsArray = this._ss.getSheets();
    let sheets = {length:sheetsArray.length};
    sheetsArray.forEach((x,i)=>
      sheets[i] = sheets[x.getName()] = sheets[x.getName().camel] = new mr.drive.ss.sheet(x)
    );//forEach
    mr.define(this,'sheets',{value:sheets});//cache it
    return sheets;
  };mr.define(mr.drive.ss.prototype,'sheets',{getter:mr.drive.ss.prototype.getSheets});

  /**
   * ss.get(mode,...requests|[request]) - Get data from the sheet.
   * @param {name|a1} request - name|a1 | {request:name|a1, mode:mode}
   * @param {string} name - Named range, must not contain !.
   * @param {String} a1 - Address in A1 notation with the sheet name, such as 'regs!A1:C5'.
   * @param {undefined|string} mode - From the enum ValueRenderOption, defaults to 'FORMULA'.
   * @example ss.get(['foo','regs!$A$1',{request:'bar',mode:'FORMULA'}],'FORMATTED_VALUE')
   * @return [*] - Array of same size as requests with retrieved values.
   */
  mr.drive.ss.prototype.get = function(mode='FORMULA',requests=[]){
    if(!mr.is.arr(requests)) requests = [requests];
    requests = requests.map((x,i)=>{
      if(!mr.is.obj(x)) return {request:x,mode:mode,index:i};
      if(mr.is.str(x.mode)) return {request:x.request,mode:x.mode,index:i};
      return {request:x.request,mode:mode,index:i};
    },this).sort((x,y)=>x.mode>y.mode ? 1 : -1);
    let responses = [];
    requests.forEach((x,i)=>{
      if(i && requests[i-1].mode!==x.mode){
        var prevIndex = responses.length && responses[i-1].index || 0;
        var curResponses = this.batchGet(requests.split(prevIndex,i-1));
        responses = responses.concat(curResponses.map(y,j => ({response:y,index:prevIndex+j})));
      }//if
      
    },this);//forEach
    
    if(mr.drive.ss.useSheetsAPI){
      var reqs = requests.map(x,i => ({value:x,index:i}))
                         .filter(x => x.value.request.has('!'));
      var batchResults = this.batchGet(reqs);
      return requests.map(function(x,i){
        //plug in results from batchGet
        var matches = reqs.filter(y,j => i===y.index);
        if(matches.length) return matches.uno().value;
        //CAN WE LOOP THROUGH TWICE, FIRST TIME DOING BATCHGET (IF ENABLED) THEN
        //DOING GETBYNAME?
        var r = this.getRangeByName(x.value);
        if('FORMULA'===mode) return r.getFormula();
        if('FORMATTED_VALUE'===mode) return r.getDisplayValue();
        mr.assert('UNFORMATTED_VALUE'===mode,'ss.get: invalid mode: '+mode);
        return r.getValue();
      },this);//map
    }//if
    return requests.map(function(x){
      var r = x.request.has('!') ? this.getRange(x.request) : this.getRangeByName(x.request);
      if('FORMULA'===x.mode) return r.getFormula();
      if('FORMATTED_VALUE'===x.mode) return r.getDisplayValue();
      mr.assert('UNFORMATTED_VALUE'===x.mode,'ss.get: invalid mode: '+mode);
      return r.getValue();
    },this);//map
  }//drive.ss.batchGet
  
  /**
   * Read data from the given sheets, or all sheets, into tables accessed via ss.sheets[0].table.
   * ss.read(undefined | mode, undefined | [reference])
   * ss.read(undefined | mode, {reference}, {reference}, {reference}, ...)
   * @param reference : {sheet:sheet, columns:undefined | [column]}
   * @param sheet : {id:number | index:number | name:string}
   * @param column : {letter:string | number:number | heading:string}
   * @example ss.read('FORMULA',)
   */
  mr.drive.ss.prototype.read = function({mode='FORMATTED_VALUE',sheets=this.sheets}){
    sheets.forEach((x,i)=>{
      let headings;
      const s = this[x.id || x.index || x.name];
      mr.assert(s,'ss.read: Invalid sheet reference!');
      if(s.tableColumns.length) return mr.log.warn('ss.read: Sheet "'+s.name+'" has already been read. Not reading again.');
      //always read the headings separately
      //TODO: batch up all sheets' requests for headings into one batchGet
      //mr.log('REQUEST: \''+s.properties.name+'\'!1:1');
      if(!mr.drive.ss.useSheetsAPI) headings = s.properties.sheet.getRange('1:1').getValues()[0];
      else{
        const headingsResponse = this.batchGet({
          requests : "'"+s.name+"'!1:1",
          mode     : 'FORMATTED_VALUE'
        });//batchGet
        headings = (  headingsResponse.valueRanges[0].values              //if there are values
                   && headingsResponse.valueRanges[0].values[0][0].length //if the first heading is non-blank
                   ) ? headingsResponse.valueRanges[0].values[0] : [];
      }//else
      mr.assert(s.tableColumns.length===headings.length,'ss.read: headings changed! TODO: update old headings');
      headings.forEach((y,j)=>mr.assert(y===s.tableColumns[j],'ss.read: headings changed! TODO: update old headings'),this);
      s.tableColumns = headings.map((y,j)=>({heading:y}),this);
      //determine which columns we are supposed to read
      //var cols = 
      
      //s.headings MUST have blanks for columns not included in read()!!!!!!!!!
      
      cols = sheets[i].columns;
      if(isUndefined(cols)) cols = headings.map((y,j)=>({index:j+1}));
      else if(!isArray(cols)){
        //treat object as if it were an array
        if(isObject(cols)) cols = Object.keys(cols).map(y=>cols[y]);
        else cols = [cols];
      }//if
      mr.assert(0<=cols.length,'invalid columns array');
      colsCache.push(cols);
      //build our requests
      requests.push("'"+s.properties.name+"'!1:1");//always get the headings
      for(let j=0;j<cols.length;++j){
        c = cols[j].letter||cols[j].index||cols[j].heading||cols[j];
        //if(!c) throw new Error('invalid column reference: '+JSON.stringify(cols[j]));
        colLetter = colToLetter(c,headings);
        colNumber = colToNum(c,headings);
        //mr.log('cols[j].letter: '+colLetter);
        //mr.log('cols[j].number: '+colNumber);
        //mr.log('cols[j]: '+JSON.stringify(cols[j]));
        mr.assert(colLetter,'failed to convert column to letter');
        mr.assert(colNumber,'failed to convert column to number');
        mr.assert(mr.is.undef(s[colLetter]),'attempting to overwrite previously read sheet data');
        const requestDesc = "'"+s.properties.name+"'!"+colLetter+'1:'+colLetter;
        //mr.log('REQUEST: '+requestDesc);
        requests.push(requestDesc);
        s.properties.colsRead.push(colNumber);
      }//for
    },this);//forEach
  }//read
  
mr.drive.ss.prototype.read = function(args){
  var mode = (args && args.mode) || 'FORMATTED_VALUE';
  var sheets = null;
  if(isUndefined(args) || isUndefined(args.sheets)) sheets = this.properties.sheets.map(function(x){return {name:x.properties.name}});
  else if(isObject(args)) sheets = isArray(args.sheets) ? args.sheets : [args.sheets];
  else if(isArray(args))  sheets = args;
  else throw new Error('ss.read: Unexpected args');
  var i,j,k,s,headings,numRows,numCols,cols,c,colLetter,colNumber;
  var colsCache = [];
  var requests = [];
  for(i=0;i<sheets.length;++i){
    s = this[sheets[i].name || sheets[i].properties.name || sheets[i].index];
    mr.assert(s,'ss.read: Invalid sheet reference!');
    if(s.properties.colsRead.length){
      mr.log.warn('ss.read: Sheet "'+s.properties.name+'" has already been read. Not reading again.');
      return this;
    }//if
    //always read the headings separately
    //TODO: batch up all sheets' requests for headings into one batchGet
    //mr.log('REQUEST: \''+s.properties.name+'\'!1:1');
    var useSheetsAPI = true;
    if(useSheetsAPI){
      var headingsResponse = this.batchGet({
        requests : "'"+s.properties.name+"'!1:1",
        mode     : 'FORMATTED_VALUE'//mode
      });//batchGet
      headings = (
        headingsResponse.valueRanges[0].values &&           //if there are values
        headingsResponse.valueRanges[0].values[0][0].length //if the first heading is non-blank
      ) ? headingsResponse.valueRanges[0].values[0] : [];
    }else{
      headings = s.properties.sheet.getRange('1:1').getValues()[0];
    }//else
    for(j=0;j<s.properties.headings.length;++j){
      if(j>=headings.length) break;
      mr.assert(s.properties.headings[j]===headings[j],'headings changed! TODO: update old headings');
    }//for
    s.properties.headings = headings;
    //mr.log('sheet '+s.properties.name.toCamelCase()+' has '+headings.length+' headings:');
    //headings.forEach(function(y,j){mr.log('        '+j+': '+y)});
    //determine which columns we are supposed to read
    cols = sheets[i].columns;
    if(isUndefined(cols)) cols = headings.map(function(y,j){return {index:j+1}});
    else if(!isArray(cols)){
      //treat object as if it were an array
      if(isObject(cols)) cols = Object.keys(cols).map(function(y){return cols[y]});
      else cols = [cols];
    }//if
    mr.assert(0<=cols.length,'invalid columns array');
    colsCache.push(cols);
    //build our requests
    requests.push("'"+s.properties.name+"'!1:1");//always get the headings
    for(j=0;j<cols.length;++j){
      c = cols[j].letter||cols[j].index||cols[j].heading||cols[j];
      //if(!c) throw new Error('invalid column reference: '+JSON.stringify(cols[j]));
      colLetter = colToLetter(c,headings);
      colNumber = colToNum(c,headings);
      //mr.log('cols[j].letter: '+colLetter);
      //mr.log('cols[j].number: '+colNumber);
      //mr.log('cols[j]: '+JSON.stringify(cols[j]));
      mr.assert(colLetter,'failed to convert column to letter');
      mr.assert(colNumber,'failed to convert column to number');
      mr.assert(mr.is.undef(s[colLetter]),'attempting to overwrite previously read sheet data');
      var requestDesc = "'"+s.properties.name+"'!"+colLetter+'1:'+colLetter;
      //mr.log('REQUEST: '+requestDesc);
      requests.push(requestDesc);
      s.properties.colsRead.push(colNumber);
    }//for
  }//for
  var response = this.batchGet({requests:requests,mode:mode});
  mr.assert(response,'ss.read: Failed to read!');
  var curHeading,curAbbr,responseValues;
  for(i=0;i<sheets.length;++i){
    s = this[sheets[i].name || sheets[i].properties.name || sheets[i].index];
    //numRows = profile(function(){return s.getNumRows()},'getNumRows');
    cols = colsCache[i];
    //replace undefined values (blank cells) with empty strings
    responseValues = response.valueRanges[0].values;
    if(!responseValues) responseValues = response.valueRanges[0].values = [''];
    cols.forEach(function(y,j){
      if(undefined!==responseValues[j]) return;//continue;
      responseValues.push('');
    });//forEach
    cols.forEach(function(y,j){
      responseValues = response.valueRanges[j+1].values;
      if(!responseValues) responseValues = response.valueRanges[j+1].values = [''];
    });//forEach
    /*headings = */response.valueRanges.shift().values[0];//get the 1:1 request
    //if(!s.properties.headings || 1>s.properties.headings.length) s.properties.headings = headings;
    headings = s.properties.headings;
    cols.forEach(function(y,j){
      c = y.letter||y.index||y.heading||y;
      colLetter = colToLetter(c,s.properties.headings);
      colNumber = colToNum(c,s.properties.headings);
      responseValues = response.valueRanges.shift().values.map(function(z){return z[0]});
      //for(k=0;k<responseValues.length;++k) responseValues[k] = responseValues[k][0];
      curHeading = s.properties.headings[s.properties.colsRead[j]-1];
      curAbbr = curHeading.toCamelCase();
      //mr.log('reading sheet '+s.properties.name+' column: '+curHeading+'  ('+curAbbr+')');
      s.properties.original[curHeading] = s.properties.original[colLetter] = s.properties.original[colNumber] = clone(responseValues);
      //make sure our variable names don't collide with our other names
      var hasHeading  = -1;
      var hasAbbr     = -1;
      var hasNickname = 0;
      headings.forEach(function(z,k){
        //mr.log(z+' =?= '+curHeading+' ⇒ '+(z===curHeading)+' ⇒ headingCount: '+hasHeading);
        if(z===curHeading) ++hasHeading;
        if(z.toCamelCase()===curAbbr) ++hasAbbr;
      });//forEach
      Object.keys(s).forEach(function(z,k){
        mr.assert(z!==colLetter,'mr.drive.ss.read: Column letter "'+colLetter+'" is already defined!');
        mr.assert(z!==colNumber,'mr.drive.ss.read: Column number "'+colNumber+'" is already defined!');
        if(!isUndefined(curHeading) && z===curHeading) ++hasHeading;
        if(!isUndefined(y.nickname) && z===y.nickname) ++hasNickname;
        if(!isUndefined(curAbbr   ) && z===curAbbr   ) ++hasAbbr;
      });//forEach
      responseValues.number   = colNumber;
      responseValues.letter   = colLetter;
      responseValues.heading  = curHeading;
      responseValues.abbr     = curAbbr;
      responseValues.nickname = y.nickname;
      s[colLetter] = s[colNumber] = responseValues;//these are non-negotiable
      if(!hasHeading ) s[curHeading] = responseValues; //else mr.log.warn('ss.read: '+s.properties.name+'!'+colLetter+' cannot be assigned heading: ' +curHeading);
      if(!hasAbbr    ) s[curAbbr   ] = responseValues; //else mr.log.warn('ss.read: '+s.properties.name+'!'+colLetter+' cannot be assigned abbr: '    +curAbbr   );
      if(!hasNickname) s[y.nickname] = responseValues; //else mr.log.warn('ss.read: '+s.properties.name+'!'+colLetter+' cannot be assigned nickname: '+y.nickname);
    });//forEach
    //mr.log('read: s.properties.name: '+s.properties.name);
  }//for
  return this;
}//mr.drive.ss.read

mr.drive.ss.prototype.write = function(args){
  var i,j,n,m,sheetKeys,ssKeys;
  mr.log('write('+JSON.stringify(args)+')');
  if(!args) args = {};
  if(args.sheets) ;//args.sheets = clone(args.sheets);
  else{
    args.sheets = this.properties.sheets;//when no args are specified, build args that request every valid sheet
    //mr.log('sheets.length: '+args.sheets.length);
/*  ssKeys = getObjectKeys(this);
    for(i=0;i<ssKeys.length;++i){
      n = Number(ssKeys[i]);
      if(isNaN(n) || n%1!=0) continue;
      args.sheets.push({index:n});
    }//for
*/}//if
  if(!isArray(args.sheets)) args.sheets = [args.sheets];
  var valueRanges = [];
  var k,s,numRows,cols,c,colLetter,colNumber,isDirty,newValueRange;
  var requests = [];
  var req,reqUpdate,reqAdjRows,gridCoord,value,valueOld,userValue,maxRows,rowsToAdj;
  for(i=0;i<args.sheets.length;++i){
    var curSheet = args.sheets[i];
    var sheetRef = curSheet.name || curSheet.index || curSheet.properties.name || curSheet.properties.index;
    s = this[sheetRef];
    mr.assert(s,'invalid sheet reference');
    if(1>s.properties.colsRead.length) continue;//no data in this sheet
    cols = curSheet.columns;
    if(!cols){
      //when no columns are specified, build args that request every loaded column
      curSheet.columns = [];
      s.properties.colsRead.forEach(function(y){
        curSheet.columns.push({index:y});
      });//forEach
      //for(j=0;j<s.properties.colsRead.length;++j){
      //  curSheet.columns.push({index:s.properties.colsRead[j]});
      //}//for
      cols = curSheet.columns;
    }//if
    if(!isArray(cols)){
      //treat object as if it were an array
      if(isObject(cols)) cols = Object.keys(cols).map(function(x){return cols[x]});
      else cols = [cols];
    }//if
    //if(0<cols.length) mr.log('write: '+s.properties.name+'.cols('+cols.length+'): '+JSON.stringify(cols));
    //get the max num of rows across all columns
    maxRows = 0;
    for(j=0;j<cols.length;++j){
      c = cols[j].letter||cols[j].index||cols[j].heading||cols[j];
      //if(!c) throw new Error('invalid column reference');
      colLetter = colToLetter(c,s.properties.headings);
      colNumber = colToNum(c,s.properties.headings);
      mr.assert(colLetter,'failed to convert column to letter');
      mr.assert(colNumber,'failed to convert column to number');
      mr.assert(mr.is.def(s[colLetter]),'attempting to write sheet data that has not been read in yet');
      //mr.log('ss.write: '+s.properties.name+'['+c+'].length: '+s[colLetter].length);
      maxRows = Math.max(maxRows/*||0*/,s[colLetter].length);
    }//for
    numRows = s.properties.maxRows;
    //make a request to append/delete rows if necessary
    var headingsOnly = curSheet.headingsOnly || (undefined==curSheet.headingsOnly && args.headingsOnly);
    if(headingsOnly) maxRows = 1;
    else if(numRows<maxRows){
      reqAdjRows = Sheets.newAppendDimensionRequest();
      reqAdjRows.sheetId   = s.properties.id;
      reqAdjRows.dimension = 'ROWS';
      rowsToAdj = maxRows - numRows;
      reqAdjRows.length = rowsToAdj;
      numRows = s.properties.numRows = maxRows;
      //add the final request to our list
      req = Sheets.newRequest();
      req.appendDimension = reqAdjRows;
      //mr.log('REQUEST: '+s.properties.name+'.appendDimension('+rowsToAdj+' ROWS)');
      requests.push(req);
    }else if(numRows>maxRows){
      reqAdjRows = Sheets.newDeleteDimensionRequest();
      reqAdjRows.range = {};
      reqAdjRows.range.sheetId = s.properties.id;
      reqAdjRows.range.dimension = 'ROWS';
      reqAdjRows.range.startIndex = maxRows;
      reqAdjRows.range.endIndex = numRows;
      rowsToAdj = numRows - maxRows;
      numRows = s.properties.numRows = maxRows;
      //add the final request to our list
      req = Sheets.newRequest();
      req.deleteDimension = reqAdjRows;
      //mr.log('REQUEST: '+s.properties.name+'.deleteDimension('+reqAdjRows.range.startIndex+':'+reqAdjRows.range.endIndex+' ['+rowsToAdj+' ROWS])');
      requests.push(req);
    }//if
    for(j=0;j<cols.length;++j){
      c = cols[j].letter||cols[j].index||cols[j].heading;
      colLetter = colToLetter(c,s.properties.headings);
      colNumber = colToNum(c,s.properties.headings);
      //make requests to update changed cells
      for(k=0;k<maxRows;++k){
        //if(s[colLetter].length<=k) s[colLetter].set(k,'');
        value = s[colLetter][k];
        valueOld = s.properties.original[colLetter][k];
        if(value===valueOld){
          //mr.log('write('+s.properties.name+'!'+colLetter+k+'): UNCHANGED');
          continue;//only update dirty values
        }//if
        //mr.log('write('+s.properties.name+'!'+colLetter+k+'): CHANGED: '+value);
        gridCoord = Sheets.newGridCoordinate();
        gridCoord.sheetId = s.properties.id;
        gridCoord.rowIndex = k;
        gridCoord.columnIndex = colNumber-1;
        reqUpdate = Sheets.newUpdateCellsRequest();
        reqUpdate.fields = 'userEnteredValue';
        reqUpdate.start = gridCoord;
        reqUpdate.rows = [];
        userValue = Sheets.newExtendedValue();
        if(type(value).isString && '='===value[0])  userValue.formulaValue = value;
        else if(type(value).isBoolean)              userValue.boolValue    = value;
        else if(type(value).isNumber)               userValue.numberValue  = value;
        //else if(isNaN(value))                     userValue.numberValue  = Number(value);//try to coerce strings of numbers into numbers
        else                                        userValue.stringValue  = ''+value;
        reqUpdate.rows.push(Sheets.newRowData());
        reqUpdate.rows.last().values = [];
        reqUpdate.rows.last().values.push(Sheets.newCellData());
        reqUpdate.rows.last().values.last().userEnteredValue = userValue;
        //add the final request to our list
        req = Sheets.newRequest();
        req.updateCells = reqUpdate;
        //mr.log('REQUEST: '+s.properties.name+'.updateCells('+colLetter+(k+1)+')');
        requests.push(req);
      }//for
    }//for
  }//for
  ////mr.log('REQUESTs: '+JSON.stringify(requests));
  return this.batchSet(requests);
}//mr.drive.ss.write

  //////////////////////////////////////////////
  //////////////////////////////////////////////
  // drive.sheet
  //////////////////////////////////////////////
  //////////////////////////////////////////////
  
  /**
   * new drive.ss.sheet( _sheet ) - Construct a sheet object.
   * @param _sheet {Sheet}
   * @return drive.ss.sheet
   */
  mr.drive.ss.sheet = function(_sheet){
    mr.assert(new.target,'mr.drive.ss.sheet must be called with new');
    Object.defineProperty(this,'_sheet',{value:_sheet});//make our private member public but read-only
    for(let x in _sheet) this[x] = mr.is.func(_sheet[x]) ? partial({thisArg:_sheet,func:x}) : _sheet[x];//inherit from base
  };//drive.ss.sheet
  
  /**
   * sheet.column(_column) - Gets a column object for the given column reference.
   * @param _column : reference | colNumber | colLetter | colHeading
   * @param reference : {letter:string | number:number | heading:string}
   * @param colNumber : number - Column number, starting with 1.
   * @param colLetter : string - Column letter in absolute A1 notation, must include $.
   * @param colHeading : string - Value of the first row in the column.
   * @example sheet.column('ID')
   * @return {letter:string,number:number,heading:string}
   */
  mr.drive.ss.sheet.prototype.getColumn = mr.drive.ss.sheet.prototype.getCol = function(_column){
    let colLetter,colNumber,colHeading;
    if(mr.is.obj(_column)) _column = _column.letter || _column.number || _column.heading;
    if(mr.is.num(_column) && 0<_column){
      colNumber = _column;
      colLetter = colToLetter(colNumber);
      colHeading = this.headings[colNumber-1];
    }else if(mr.is.str(_column)){
      if('$'===_column[0]){
        colLetter = _column;
        colNumber = colToNumber(colLetter);
        colHeading = this.headings[colNumber-1];
      }else{
        colHeading = _column;
        colNumber = colToNumber(_column,this.headings);
        colLetter = colToLetter(colNumber);
      }//else
    }else throw new Error('sheet.getColumn: invalid column reference: '+_column);
    return {letter:colLetter,number:colNumber,heading:colHeading};
  }//getColumn
  
  /**
   * sheet.ss - First use will get the sheet's parent spreadsheet and cache it; subsequent uses gets the cached result.
   * sheet.getSpreadsheet() - Always gets the sheet's parent spreadsheet and caches it as 'ss'.
   * @return drive.ss
   */
  mr.drive.ss.sheet.prototype.getSpreadsheet = mr.drive.ss.sheet.prototype.getSS = mr.drive.ss.sheet.prototype.getParent = function(){
    const ss = this._sheet.getParent();
    mr.define(this,['ss','parent','spreadsheet'],{value:ss});//cache it
    return ss;
  };mr.define(mr.drive.ss.sheet.prototype,['ss','parent','spreadsheet'],{getter:mr.drive.ss.sheet.prototype.getSpreadsheet});
  
  /**
   * sheet.id - First use will get the sheet id and cache it; subsequent uses gets the cached result.
   * sheet.getId() - Always gets the current sheet id and caches it as 'id'.
   * @return string
   */
  mr.drive.ss.sheet.prototype.getSheetId = mr.drive.ss.sheet.prototype.getId = function(){
    const id = this._sheet.getSheetId();
    mr.define(this,['sheetId','id'],{value:id});//cache it
    return id;
  };mr.define(mr.drive.ss.sheet.prototype,['sheetId','id'],{getter:mr.drive.ss.sheet.prototype.getId});
  
  /**
   * sheet.name - First use will get the sheet name and cache it; subsequent uses gets the cached result.
   * sheet.getName() - Always gets the current sheet name and caches it as 'name'.
   * @return string
   */
  mr.drive.ss.sheet.prototype.getName = function(){
    const name = this._sheet.getName();
    mr.define(this,'name',{value:name});//cache it
    return name;
  };mr.define(mr.drive.ss.sheet.prototype,'name',{getter:mr.drive.ss.sheet.prototype.getName});
  
  /**
   * sheet.rows - First use will get the sheet rows and cache it; subsequent uses gets the cached result.
   * sheet.getRows() - Always gets the current sheet rows and caches it as 'rows'.
   * @return {max:number,last:number}
   */
  mr.drive.ss.sheet.prototype.getRows = function(){
    const rows = {
      max  : this._sheet.getMaxRows(),
      last : this._sheet.getLastRow()
    };//rows
    mr.define(this,'rows',{value:rows});//cache it
    return rows;
  };mr.define(mr.drive.ss.sheet.prototype,'rows',{getter:mr.drive.ss.sheet.prototype.getRows});
  
  /**
   * sheet.cols - First use will get the sheet columns and cache it; subsequent uses gets the cached result.
   * sheet.getCols() - Always gets the current sheet columns and caches it as 'cols'.
   * @return {max:number,last:number}
   */
  mr.drive.ss.sheet.prototype.getCols = function(){
    const cols = {
      max  : this._sheet.getMaxColumns(),
      last : this._sheet.getLastColumn()
    };//cols
    mr.define(this,'cols',{value:cols});//cache it
    return cols;
  };mr.define(mr.drive.ss.sheet.prototype,'cols',{getter:mr.drive.ss.sheet.prototype.getCols});
  
  /**
   * sheet.form - First use will get the sheet's linked form and cache it; subsequent uses gets the cached result.
   * sheet.getForm() - Always gets the current sheet's linked form and caches it as 'form'.
   * @return drive.form
   */
  mr.drive.ss.sheet.prototype.getForm = function(){
    const form = new drive.form(this._sheet.getFormUrl());
    mr.define(this,'form',{value:form});//cache it
    return form;
  };mr.define(mr.drive.ss.sheet.prototype,'form',{getter:mr.drive.ss.sheet.prototype.getForm});
  
  /**
   * sheet.read( requests ) - Read data for this sheet only.
   * @param requests : undefined | {columns:[columnReference]} | [columnReference]
   * @param columnReference : {letter:string | number:number | heading:string}
   */
  mr.drive.ss.sheet.prototype.read = function(args){
    args = args||{};
    if(mr.is.arr(args)) args = {columns:args};
    args.name = this.name;
    this.ss.read(args);
  }//drive.ss.sheet.read
  
  /**
   * sheet.write( requests ) - Write data for this sheet only.
   * @param requests : undefined | {columns:[columnReference]} | [columnReference]
   * @param columnReference : {letter:string | number:number | heading:string}
   */
  mr.drive.ss.sheet.prototype.write = function(args){
    args = args||{};
    if(mr.is.arr(args)) args = {columns:args};
    args.name = this.name;
    this.ss.write(args);
  }//drive.ss.sheet.write
  
  /**
   * sheet.get( name | a1 ) - Get a range by name or address (SLOW!)
   * @param name : string - Name of a defined named range.
   * @param a1 : string - Range address in A1 notation (must be absolute including $ symbols).
   * @return Range
   */
  mr.drive.ss.sheet.prototype.get = function(args){
    if(!mr.is.str(args)) return log.error('sheet.get: invalid argument');
    const isAddress = 1<args.indexOf('$') && parseFloats(args).length;
    if(!isAddress) return this.getRangeByName(args);
    if(!args.has('!')) args = this.name+'!'+args;
    return this.getRange(args);
  }//drive.ss.sheet.get
  
  /**
   * sheet.deleteRows( rows ) - Delete the rows indicated by the provided list.
   * @param rows : [number] - Array of row numbers to delete.
   */
  mr.drive.ss.sheet.prototype.deleteRows = function(indices){
    if(!mr.is.arr(indices)) indices = [indices];
    indices.sort((a,b)=>b-a);//sorts in place, highest-to-lowest
    //this.colsRead.forEach(function(x){
    //this.table.
    for(let x in this.table){
      indices.forEach(y=>this.table[x].splice(y,1),this);
    }//for
  }//drive.ss.sheet.deleteRows
  
  /**
   * Update the sheet with the URLs of each response matching each row.
   * @param {{url:{heading:'cow'},response:[{heading:'Timestamp'},{index:10}]}} args
   *        Object containing all the necessary named parameters:{
   *               url: {heading:string | letter:string | index:number}
   *                    The column letter, number, or heading where the URL's are kept
   *          response: [{heading:string | letter:string | index:number}]
   *                    The columns (indicated by letters, numbers, or headings) where response data is kept.
   *        }
   * @return True if successful, false otherwise.
   */
  mr.drive.ss.sheet.prototype.updateResponseURLs = function(args){
    args = args||{};
    var i,j,c,answers,email,matches,oldUrl,newUrl;
    var urlCol = args['urls']['index']||args['urls']['letter']||args['urls']['heading'];
    var urls = this[urlCol];
    mr.assert(urls,'invalid URL column');
    var numRows = this.getNumRows();
    var responseCols = args['responses'];
    if(!mr.is.arr(responseCols)) responseCols = [responseCols];
    var url = this.getFormUrl();
    mr.assert(url,'sheet is not linked with a form');
    //log('urls.length: '+urls.length);
    var form = new drive.form({url:url});
    for(i=1;i<numRows;++i){
      oldUrl = urls[i]||'';
      if(!args['overwrite'] && oldUrl) continue;
      answers = [];
      for(j=0;j<responseCols.length;++j){
        c = responseCols[j]['index']||responseCols[j]['letter']||responseCols[j]['heading'];
        mr.assert(c,'invalid response column');
        answers.push({question:this[c][0],answer:this[c][i]});
      }//for
      matches = form.findResponse(answers);
      //log('matches: '+matches.length);
      if(0==matches.length)      newUrl = '<< NOT FOUND ('+i+') at '+timestamp({format:'M/D h:mm:ss.SSSA'})+' >>';
      else if(1==matches.length) newUrl = matches[0];
      else throw new Error('Multiple matches found');
      if(0<=oldUrl.indexOf('<< NOT FOUND')){
        if(0>newUrl.indexOf('<< NOT FOUND')) log({msg:'Response was found but it used to not exist!'});
      }else if(''===oldUrl){
        if(0<=newUrl.indexOf('<< NOT FOUND')) log({msg:'Response cannot be found'});
      }else{
        if(0<=newUrl.indexOf('<< NOT FOUND')) log({msg:'Response used to exist but can no longer be found!'});
      }//else
      urls.set(i,newUrl);
    }//for
  }//drive.ss.sheet.updateResponseURLs
    
  //////////////////////////////////////////////
  //////////////////////////////////////////////
  // api
  //////////////////////////////////////////////
  //////////////////////////////////////////////
  
  mr.api = {};
  
  //////////////////////////////////////////////
  // api.sheets
  //////////////////////////////////////////////
  
  mr.api.sheets                       = {};
  mr.api.sheets.enabled               = true;
  mr.api.sheets.quotas                = {};
  mr.api.sheets.quotas.read           = {};
  mr.api.sheets.quotas.read.throttle  = mr.partial({func:mr.api.sheets.throttle,args:[mr.api.sheets.quotas.read]});
  mr.api.sheets.quotas.read.freq      = 1000;//milliseconds between requests
  mr.api.sheets.quotas.read.last      = null;
  mr.api.sheets.quotas.write          = {};
  mr.api.sheets.quotas.write.throttle = mr.partial({func:mr.api.sheets.throttle,args:[mr.api.sheets.quotas.write]});
  mr.api.sheets.quotas.write.freq     = 1000;//milliseconds between requests
  mr.api.sheets.quotas.write.last     = null;
  mr.api.sheets.throttle              = function(quota,requests){
    const sleepDuration = Math.max(0,/*requests.length**/quota.freq - duration(quota.last).ms);
    log('api.sheets.quotas.throttle: sleeping '+sleepDuration+'ms');
    Utilities.sleep(sleepDuration);
    quota.last = Date.now();
  };//throttle
  
  /**
   * Use the Sheets API to batch get data.
   * api.sheets.batchGet({id,ranges,valueRenderOption,majorDimension,dateTimeRenderOption})
   * @param id : string - Unique id of the spreadsheet.
   * @param ranges : [string] - Array of addresses in A1 notation.
   * @param valueRenderOption : undefined|string - Valid options: FORMATTED_VALUE,UNFORMATTED_VALUE,FORMULA; defaults to FORMULA.
   * @param majorDimension : undefined|string - Valid options: ROWS,COLUMNS,DIMENSION_UNSPECIFIED; defaults to ROWS.
   * @param dateTimeRenderOption : undefined|string - Valid options: FORMATTED_STRING,SERIAL_NUMBER; defaults to SERIAL_NUMBER.
   * @example api.sheets.batchGet({id:'asdf1234',ranges:['regs!A1','regs!B3']})
   * @return Response
   */
  mr.api.sheets.batchGet = function({id,ranges,valueRenderOption='FORMULA',majorDimension='ROWS',dateTimeRenderOption='SERIAL_NUMBER'}){
    mr.assert(mr.api.sheets.enabled && mr.is.def(Sheets),'Sheets API not enabled');
    const argsObj = arguments[0];
    mr.api.sheets.quotas.read.throttle(ranges);
    //mr.log('batchGet requests: '+JSON.stringify(p.ranges));
    tryFail(
      ()=>profile(()=>Sheets.Spreadsheets.Values.batchGet(id,argsObj),'Sheets.batchGet'),
      (err)=>{
        const msg = err.message+'\n\n'+err.stack;
        const firstExclamation = err.message.indexOf('!');
        if(0<=firstExclamation){
          const sheetName = err.message.substring(err.message.indexOf("'")+1,firstExclamation-1);
          const missingCol = err.message.right(err.message.indexOf(':',firstExclamation)+1);
          msg = 'Please make sure you have a column named "'+missingCol+'" (case-sensitive) on the '+sheetName+' sheet.\n\n'+msg;
        }//if
        throw new Error(msg);
      }//fail
    );//tryFail
  }//batchGet

  /**
   * api.sheets.batchUpdate({id,requests})
   * @param id : string - Unique id of the spreadsheet.
   * @param requests : [Request] - Array of Request objects created by the Sheets API and filled in by caller.
   * @example api.sheets.batchUpdate('asdf1234',[Sheets.newRequest()])
   * @return Response
   */
  mr.api.sheets.batchUpdate = function({id,requests}){
    if(mr.api.sheets.enabled && mr.is.def(Sheets),'Sheets API not enabled');
    mr.api.sheets.quotas.write.throttle(requests);
    mr.log('sheets.batchUpdate('+JSON.stringify(requests)+')');
    return profile(()=>Sheets.Spreadsheets.batchUpdate({requests:requests},id),'batchUpdate');
  }//batchUpdate

  ////////////////////////////////
  ////////////////////////////////
  // Prototype extensions
  ////////////////////////////////
  ////////////////////////////////
  
  ////////////////////////////////
  // Array prototype
  ////////////////////////////////
  
  /**
   * array.last - Get the last element in this array.
   */
  if(Array.prototype.last) mr.log.warn('Array.prototype.last ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'last',{get:()=>this[this.length-1]});
  
  /**
   * array.set(index,value) - Set an element in the array but first ensure the array is grown to be at least this size.
   * @param index : number - Where in the array to set.
   * @param value : * - Value to set into the array.
   * @return * - The new value of the element.
   */
  if(Array.prototype.set) mr.log.warn('Array.prototype.set ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'set',{value: function(index,value){
    this.length = Math.max(index+1,this.length);
    return this[index] = value;
  }});//set

  /**
   * array.count(value) - Count how many occurrences of the given value appear in this array.
   * @param {*} value - Value to search for.
   * @return {number}
   */
  if(Array.prototype.count) mr.log.warn('Array.prototype.count ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'count',{value:function(value){return this.filter(x=>x===value).length}});

  /**
   * array.has(value) - Determine if this array contains at least one occurrence of the given value.
   * @param {*} value - Value to search for.
   * @return {boolean}
   */
  if(Array.prototype.has) mr.log.warn('Array.prototype.has ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'has',{value:function(value){return !!this.count(value)}});
  
  /**
   * array.uno(onFail) - Assert that this array is of size 1.
   * @param onFail : undefined|function - Throw an error, or use the provided function on failure.
   * @return * - The only element in the array.
   */
  if(Array.prototype.uno) mr.log.warn('Array.prototype.uno ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'uno',{value:function(onFail){return this.expect(1,onFail)[0]}});
  
  /**
   * array.expect(num,onFail) - Assert that this array is of the given size.
   * @param num : number - The size this array should be.
   * @param onFail : undefined|function - Throw an error, or use the provided function on failure.
   * @return [*] - This array, for chaining.
   */
  if(Array.prototype.expect) mr.log.warn('Array.prototype.expect ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'expect',{value:function(num,onFail){
    //TODO: support an array of allowable expections
    if(num!==this.length){
      mr.assert(mr.is.func(onFail),'array expected '+num+' results but found '+this.length);
      onFail(this);
    }//if
    return this;//for chaining
  }});//expect
  
  /**
   * array.filterIndex(func,thisArg) - Filter this array according to the given func and return indices.
   * @param func : function - Filtering method.
   * @param thisArg : undefined|* - ThisArg to use when calling array.map and array.filter.
   * @return [number] - Array of indices that passed the filter.
   */
  if(Array.prototype.filterIndex) mr.log.warn('Array.prototype.filterIndex ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'filterIndex',{value:function(func,thisArg){
    return this.map   (function(x,i){return {value:x,index:i}},thisArg)
               .filter(function(x,i){return   func(x.value,i)},thisArg)
               .map   (function(x,i){return        x.index   },thisArg);
  }});//filterIndex
  
  /**
   * array.random() - Get a uniformly random value from this array.
   * @return *
   */
  if(Array.prototype.random) mr.log.warn('Array.prototype.random ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'random',{value:function(start=0,exclude=[]){return this[mr.rng.int({min:start,max:this.length,exclude:exclude})]}});
  
  /**
   * array.random.gaussian() - Get a gaussian random value from this array.
   * @return *
   */
  Object.defineProperty(Array.prototype.random,'gaussian',{value:function(start=0,exclude=[]){return this[mr.rng.int({min:start,max:this.length,exclude:exclude}).gaussian({min:start,max:this.length})]}});
  
  /**
   * array.shuffle() - Shuffles array in place.
   * @return [*]
   */
  if(Array.prototype.shuffle) mr.log.warn('Array.prototype.shuffle ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'shuffle',{value:function(){
    for(let i=this.length-1;i>0;--i){
      const j = Math.floor(mr.rng()*(i+1));
      const x = this[i];
      this[i] = this[j];
      this[j] = x;
    }//for
    return this;//for chaining
  }});//shuffle
  
  /**
   * array.unique - This array filtered to be unique.
   * @return [*] - Unique array.
   */
  if(Array.prototype.unique) mr.log.warn('Array.prototype.unique ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'unique',{get:()=>new Set([...this])});
  
  /**
   * array.union(operand) - Union of this array with provided operand (unique values only).
   * @param operand : [*] - Array to union with this one.
   * @return [*] - Union array.
   */
  if(Array.prototype.union) mr.log.warn('Array.prototype.union ALREADY EXISTS & IS BEING OVERWRITTEN');
  Array.prototype.union = function(operand){return [...new Set([...this,...operand])]}
  
  /**
   * array.intersect(operand) - Intersection of this array with provided operand (unique values only).
   * @param operand : [*] - Array to intersect with this one.
   * @return [*] - Intersect array.
   */
  if(Array.prototype.intersect) mr.log.warn('Array.prototype.intersect ALREADY EXISTS & IS BEING OVERWRITTEN');
  Array.prototype.intersect = function(operand){return [...new Set([...this.filter(x=>operand.has(x))])]}

  /**
   * array.subtract(operand) - Subtraction of this array with provided operand (unique values only).
   * @param operand : [*] - Array to subtract with this one.
   * @return [*] - Subtraction array.
   */
  if(Array.prototype.subtract) mr.log.warn('Array.prototype.subtract ALREADY EXISTS & IS BEING OVERWRITTEN');
  Array.prototype.subtract = function(operand){return [...new Set([...this.filter(x=>!operand.has(x))])]}
  
  /**
   * array.mux(operand,...moreOperands) - Multiplex (i.e. Cartesian Product) of this array with provided operands.
   * @param operand : [*] - Array to perform mux with this one.
   * @param moreOperands : [*] - Any number of additional operands.
   * @return [*] - Mux result array.
   */
  if(Array.prototype.mux) mr.log.warn('Array.prototype.mux ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'mux',{value: function(operand,...moreOperands){
    return operand ? this.cartesian(operand).mux(...moreOperands) : this;
  }});//mux

  /**
   * array.cartesian(operand) - Cartesian product of this array with provided operand.
   * @param operand : [*] - Array to perform cartesian product with this one.
   * @return [*] - Cartesian product result array.
   */
  if(Array.prototype.cartesian) mr.log.warn('Array.prototype.cartesian ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'cartesian',{value: function(operand){
    return [].concat(...this.map(x=>operand.map(y=>[].concat(x,y))));
  }});//cartesian
  
  /**
   * array.mmult(operand) - Multiply this matrix with another;
   * @param operand : [[number]] - Matrix of numbers where the number of columns equals the number of rows in this matrix.
   * @return [[number]]
   */
  if(Array.prototype.mmult) mr.log.warn('Array.prototype.mmult ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'mmult',{value: function(operand){
    let result = [];
    this.forEach((x,i)=>{
      result[i] = [];
      operand[0].forEach((y,j)=>{
        result[i][j] = 0;
        this[0].forEach((z,k)=>{
          result[i][j] += this[i][k] * operand[k][j];//TODO: support non-numbers by using a callback func to specify operation? e.g: func(this[i][k],operand[k][j])
        },this);//forEach
      },this);//forEach
    },this);//forEach
  }});//mmult
  
  /**
   * array.transpose() - Get the transpose of this array (flip rows and columns).
   * @return [*] - The transposed array.
   */
  if(Array.prototype.transpose) mr.log.warn('Array.prototype.transpose ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'transpose',{value: function(){
    const w = this.length || 0;//Calculate the width and height of the Array
    const h = mr.is.arr(this[0]) ? this[0].length : 0;
    if(h===0||w===0) return [];//In case it is a zero matrix, no transpose routine needed
    let t = [];
    for(let i=0;i<h;++i){
      t.push([]);
      for(let j=0;j<w;++j){
        t[i].push(this[j][i]);//Save transposed data
      }//for
    }//for
    return t;
  }});//transpose
  
  /**
   * array.resize(length) - Resize this array to the new given length.
   * @param length : number - New length of the array.
   * @return [*]
   */
  if(Array.prototype.resize) mr.log.warn('Array.prototype.resize ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'resize',{value: function(length){
    this.length = length;
    return this;//for chaining
  }});//resize
  
  /**
   * array.fill(value) - Fills (modifies) all the elements of an array with the given value.
   * @param value : * - What to fill the array with, defaults to null.
   * @return [*]
   *
  if(Array.prototype.fill) mr.log.warn('Array.prototype.fill ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'fill',{value: function(value=null){
    let obj = Object(this);
    const len = obj.length.uint32;
    const start = 0;//can be parameterized
    const relativeStart = start.int32;
    let k = relativeStart < 0 ? Math.max(len+relativeStart,0) : Math.min(relativeStart,len);
    const end = undefined;//can be parameterized
    const relativeEnd = mr.is.undef(end) ? len : end.int32;
    const final = relativeEnd<0 ? Math.max(len+relativeEnd,0) : Math.min(relativeEnd,len);
    while(k<final) obj[k++] = value;
    return obj;
  }});//defineProperty
  
  /**
   * array.cut(pos,len) - Cut out the specified number of characters from the string.
   * @param pos : number - Where to start cutting.
   * @param len : number - How many elements to cut.
   * @return [*]
   */
  if(Array.prototype.cut) mr.log.warn('Array.prototype.cut ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Array.prototype,'cut',{value:function(pos,len){
    return this.substring(0,pos) + this.substring(pos+len);
  }});//cut
  
  ////////////////////////////////
  // String prototype
  ////////////////////////////////
  
  //function replace(searchIn,searchFor,replacement){return searchIn.replace(new RegExp(searchFor,'g'),replacement)}
  
  //if(String.prototype.trim) mr.log.warn('String.prototype.trim ALREADY EXISTS & IS BEING OVERWRITTEN');
  //Object.defineProperty(String.prototype,   'trim',{get:function(){return this.trim()}});

  if(String.prototype.isBlank) mr.log.warn('String.prototype.isBlank ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'isBlank',{get:function(){return ''===this.trim()}});
  
  if(String.prototype.lower) mr.log.warn('String.prototype.lower ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'lower',{get:function(){return this.toLowerCase()}});
  
  if(String.prototype.upper) mr.log.warn('String.prototype.upper ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'upper',{get:function(){return this.toUpperCase()}});

  if(String.prototype.camel) mr.log.warn('String.prototype.camel ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'camel',{get:function(){
    return this.toLowerCase().replace(/(?:^\w|[A-Z]|\b\w)/g,x=>i ? x.toLowerCase() : x.toUpperCase()).replace(/\s+/g,'');
  }});//camel

  if(String.prototype.count) mr.log.warn('String.prototype.count ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'count',{value:function(search){return (this.match(new RegExp(search,'g'))||[]).length}});
  
  if(String.prototype.has) mr.log.warn('String.prototype.has ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'has',{value:function(search){return 0<this.count(search)}});
  
//if(String.prototype.clone) mr.log.warn('String.prototype.clone ALREADY EXISTS & IS BEING OVERWRITTEN');
//String.prototype.clone = function(){return (' '+this).slice(1)}//force all JS VM's to make a copy
  
  /**
   * string.left(pos) - Get the left substring.
   * @param pos : number - If positive, pos is a position; if negative, pos is a count.
   * @return string
   */
  if(String.prototype.left) mr.log.warn('String.prototype.left ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'left',{value:function(pos){
    mr.assert(mr.is.num(pos),'Expected number parameter');
    if(0>pos) pos = this.length + pos;
    return this.substring(0,pos);
  }});//left
  
  /**
   * string.right(pos) - Get the right substring.
   * @param pos : number - If positive, pos is a position; if negative, pos is a count.
   * @return string
   */
  if(String.prototype.right) mr.log.warn('String.prototype.right ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'right',{value:function(pos){
    mr.assert(mr.is.num(pos),'Expected number parameter');
    if(0>pos) pos = this.length + pos;
    return this.substring(pos);
  }});//right
  
  /**
   * string.mid(pos,len) - Get the middle substring.
   * @param pos : number - Starting position of substring.
   * @param len : number - Length of substring.
   * @return string
   */
  if(String.prototype.mid) mr.log.warn('String.prototype.mid ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'mid',{value:function(pos,len){
    mr.assert(mr.is.num(pos),'string.mid: expected number pos: '+pos);
    return this.substring(pos,len);
  }});//mid
  
  /**
   * string.hash - Get a unique hash code for this string.
   * @return string
   */
  if(String.prototype.hash) mr.log.warn('String.prototype.hash ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'hash',{get:function(){
    let hash = 0;
    if(this.length == 0) return hash;
    for(let i=0;i<this.length;++i){
      const char = this.charCodeAt(i);
      hash = ((hash<<5)-hash)+char;
      hash = hash & hash; // Convert to 32bit integer
    }//for
    return hash;
  }});//hashCode
  
  /**
   * string.findClosing(pos) - Find the closing brace that matches the opening brace at the given position.
   * @param pos : number - Position of the open brace.
   * @return string
   */
  if(String.prototype.findClosing) mr.log.warn('String.prototype.findClosing ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'findClosing',{value:function(pos){
    if(!mr.is.num(openPos)) return -1;
    const closures = {'(':')','[':']','{':'}','<':'>'};
    const openBrace = this[pos];
    const closeBrace = closures[openBrace];
    let depth = 1;
    for(let i=pos+1;i<this.length;++i){
      if(openBrace===this[i]) ++depth;
      else if(closeBrace===this[i]){
        if(0===--depth) return i;
      }//else if
    }//for
    return -1;//no match
  }});//findClosing
  
  /**
   * string.distance(operand,options) - Get the distance between two strings.
   * @param operand : string
   * @param options : {gap,mismatch,match} - The options that can be changed.
   * @param gap : number - The score gain to do a gap, defaults to -1.
   * @param mismatch : number - The score gain to do a mismatch, defaults to -2.
   * @param match : number - The score gain to do a match, defaults to 2.
   * @return number
   */
  if(String.prototype.distance) mr.log.warn('String.prototype.distance ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'distance',{value:function(operand,options={}){
    return this.smithWaterman(operand,options);
    //if(opt && 'levenshtein'!=opt.method) throw new Error('string.distance: only levenshtein method currently supported');
    //var method = (opt && mr.is.str(opt.method) && opt.method) || 'levenshtein';
    //if(!mr.is.func(this[method])) throw new Error('string.distance: invalid method');
    //return this[method](operand,opt);
  }});//distance
  
  /**
   * string.levenshtein(operand) - Get the Levenshtein distance between two strings.
   * @param operand : string
   * @return number
   */
  if(String.prototype.levenshtein) mr.log.warn('String.prototype.levenshtein ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'levenshtein',{value:function(operand){
    const a = this;
    const b = operand;
    //create empty edit distance matrix for all possible modifications of substrings of a to substrings of b.
    const distanceMatrix = Array(b.length + 1).fill(null).map(function(x){return Array(a.length + 1).fill(null)});
    //fill the first row of the matrix. If this is first row then we're transforming empty string to a. In this case the number of transformations equals to size of a substring.
    for(let i=0;i<=a.length;++i) distanceMatrix[0][i] = i;
    //fill the first column of the matrix. If this is first column then we're transforming empty string to b. In this case the number of transformations equals to size of b substring.
    for(let j=0;j<=b.length;++j) distanceMatrix[j][0] = j;
    for(let j=1;j<=b.length;++j){
      for(let i=1;i<=a.length;++i){
        const indicator = a[i-1]===b[j-1] ? 0 : 1;
        distanceMatrix[j][i] = Math.min(
          distanceMatrix[ j ][i-1] + 1,          //deletion
          distanceMatrix[j-1][ i ] + 1,          //insertion
          distanceMatrix[j-1][i-1] + indicator //substitution
        );//min
      }//for
    }//for
    return distanceMatrix[b.length][a.length];
  }});//levenshtein
  
  /**
   * string.smithWaterman(operand,options) - Compute score this two strings
   * @param operand : string - The string to compare this string with.
   * @param options : {gap,mismatch,match} - The options that can be changed.
   * @param gap : number - The score gain to do a gap, defaults to -1.
   * @param mismatch : number - The score gain to do a mismatch, defaults to -2.
   * @param match : number - The score gain to do a match, defaults to 2.
   * @return number
   */
  if(String.prototype.smithWaterman) mr.log.warn('String.prototype.smithWaterman ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'smithWaterman',{value:function(operand,options={}){
    localAligner = function(arrayQ,arrayP,options){
      const gap      = (options && options.gap     ) || -1;
      const mismatch = (options && options.mismatch) || -2;
      const match    = (options && options.match   ) ||  2;
      this._q = arrayQ;
      this._p = arrayP;
      this._gapPen = gap;
      this._mismatchPen = mismatch;
      this._matchScore = match;
      this._matrixA = arrayP.concat([0]).map(function(X){return arrayQ.concat([0]).map(function(y){return 0})});
      this._matrixB = arrayP.concat([0]).map(function(X){return arrayQ.concat([0]).map(function(y){return 0})});
      this._finalQ = [];
      this._finalP = [];
      this._maxScore = 0;
      this._maxI = 0;
      this._maxJ = 0;
    };//localAligner
    localAligner.prototype.finalQ     = ()=>this._finalQ;
    localAligner.prototype.finalP     = ()=>this._finalP;
    localAligner.prototype.maxScore   = ()=>this._maxScore;
    localAligner.prototype.matrixA    = ()=>this._matrixA;
    localAligner.prototype.matrixB    = ()=>this._matrixB;
    localAligner.prototype.calcTables = ()=>{
      this._q.splice(0,0,{});
      this._p.splice(0,0,{});
      for(let i=1;i<this._p.length;++i){
        for(let j=1;j<this._q.length;++j){
          if(this._p[i] !== this._q[j]) this._matrixA[i][j] = this.findMaxScore(i,j);
          else{
            this._matrixA[i][j] = this._matrixA[i-1][j-1] + this._matchScore;
            this._matrixB[i][j] = 3;
            if(this._matrixA[i][j] > this._maxScore){
              this._maxScore = this._matrixA[i][j];
              this._maxI = i;
              this._maxJ = j;
            }//if
          }//else
        }//for
      }//for
    };//calcTables
    localAligner.prototype.findMaxScore = (i,j)=>{
      const qDelet = this._matrixA[i-1][j] + this._gapPen;// North score
      const pDelet = this._matrixA[i][j-1] + this._gapPen;// West score
      const mismatch = this._matrixA[i-1][j-1] + this._mismatchPen;// Diagonal Score
      const maxScore = Math.max(qDelet,pDelet,mismatch);
      if (qDelet === maxScore) this._matrixB[i][j] = 2; // 2 == "up" for traversing solution
      else if (pDelet === maxScore) this._matrixB[i][j] = 1; // 1 == "left" for traversing solution
      else if (mismatch === maxScore) this._matrixB[i][j] = 3; // 3 == "diagonal" for traversing solution
      return maxScore;
    };//findMaxScore
    localAligner.prototype.calcAlignemnt = (i,j)=>{
      if(i===undefined && j===undefined){
        i = this._maxI;
        j = this._maxJ;
      }//if
      if(i===0 || j===0) return;
      // Optimal solution "DIAGONAL"
      if(this._matrixB[i][j]===3){
        this.calcAlignemnt(i-1,j-1);
        this._finalQ.push(this._q[j]);
        this._finalP.push(this._p[i]);
      }else if (this._matrixB[i][j]===2){
        // Optimal solution "UP"
        this.calcAlignemnt(i-1,j);
        this._finalQ.push({});
        this._finalP.push(this._p[i]);
      }else{
        // Optimal solution "LEFT"
        this.calcAlignemnt(i,j-1);
        this._finalP.push({});
        this._finalQ.push(this._p[j]);
      }//else
    };//calcAlignment
    //use the above localAligner object to run smithWaterman below...
    const arrayQ = this.split('');
    const arrayP = mr.is.str(operand) ? operand.split('') : operand;
    mr.assert(mr.is.arr(arrayP),'string.smithWaterman: invalid operand');
    let sws = new localAligner(arrayQ,arrayP,options);
    sws.calcTables();
    sws.calcAlignemnt();
    return sws.maxScore();
  }});//smithWaterman
  
  /**
   * string.closest(list,options) - Finds a string that most closely resembles this string.
   * @param list : [string] - The array of strings to look through.
   * @param options : {gap,mismatch,match} - The options that can be changed.
   * @param gap : number - The score gain to do a gap, defaults to -1.
   * @param mismatch : number - The score gain to do a mismatch, defaults to -2.
   * @param match : number - The score gain to do a match, defaults to 2.
   * @return string - The string in the list that most closely resembles the target.
   */
  if(String.prototype.closest) mr.log.warn('String.prototype.closest ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'closest',{value:function(list,options={}){
    if(!mr.is.arr(list)) list = [list];
    let min = {dist:Infinity,index:-1};
    list.map(function(x,i){
      let dist = this.distance(x,options);
      if(dist<min.dist) min = {dist:dist,index:i};
      return dist;
    },this);//map
    return list[min.index];
  }});//closest
  
  // Function to find Longest common substring of sequences
  // X[0..m-1] and Y[0..n-1]
  /**
   * string.common(operand) - Find the longest common substring of sequences.
   * @param operand : string
   * @return string
   */
  if(String.prototype.common) mr.log.warn('String.prototype.common ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(String.prototype,'common',{value:function(operand){
    const X = this;
    const Y = operand;
    const m = X.length;
    const n = Y.length;
    let maxlen = 0;			// stores the max length of LCS
    let endingIndex = m;		// stores the ending index of LCS in X
    let lookup = [].fill([].fill(0,n+1),m+1);
//  let lookup = [];//lookup[m + 1][n + 1]
//  // initialize all cells of lookup table to 0: memset(lookup,0,sizeof(lookup))
//  for(let i=0;i<m+1;++i){
//    lookup.push([]);
//    for(let j=0;j<n+i;++j) lookup.last.push(0);
//  }//for
    // lookup[i][j] stores the length of LCS of substring
    // X[0..i-1], Y[0..j-1]
    // fill the lookup table in bottom-up manner
    for(let i=1;i<=m;++i){
      for(let j=1;j<=n;++j){
        // if current character of X and Y matches
        if(X[i-1] == Y[j-1]){
          lookup[i][j] = lookup[i-1][j-1] + 1;
          // update the maximum length and ending index
          if(lookup[i][j] > maxlen){
            maxlen = lookup[i][j];
            endingIndex = i;
          }//if
        }//if
      }//for
    }//for
    // return Longest common substring having length maxlen
    return X.substr(endingIndex-maxlen,maxlen);
  }});//common
  
  ////////////////////////////////
  // Number prototype
  ////////////////////////////////
  
  /**
   * number.rescale(domain,range) - Rescale this number value from it's current domain to the new range.
   * @param domain : {min,max} - Min and max value that this value can currently hold.
   * @param range : {min,max} - Min and max value that the result should be.
   * @param min : number - Min allowable value; defaults to 0.
   * @param max : number - Max allowable value; defaults to 0.
   * @return number - In the range [range.min,range.max]
   */
  if(Number.prototype.rescale) mr.log.warn('Number.prototype.rescale ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Number.prototype,'rescale',{value:function(domain={min:0,max:1},range={min:0,max:1}){
    mr.assert(domain.min<domain.max,'Number.rescale: please specify a max value greater than the min');
    mr.assert(range.min<range.max,'Number.rescale: please specify a new max value greater than the new min');
    mr.assert(domain.min<=this && this<=domain.max,'Number.rescale: attempting to rescale a this value '+this+' outside the min / max: ['+domain.min+','+domain.max+')');
    return (range.max - range.min)/(domain.max - domain.min)*(this - domain.min) + range.min;
  }});//rescale
  
  /**
   * number.normalize(domain) - Normalize this number value from it's current domain of [min,max] to the new range [0,1].
   * @param domain : {min,max} - The starting domain (min & max) for this number.
   * @param max : number - Max allowable value for this number, must be greater than the min and this number; defaults to 1.
   * @param min : number - Min allowable value for this number, must be lower than the max and this number; defaults to 0.
   * @return number - In the range [0,1]
   */
  if(Number.prototype.normalize) mr.log.warn('Number.prototype.normalize ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Number.prototype,'normalize',{value:function({min=0,max=1}={}){return this.rescale({min:min,max:max},{min:0,max:1})}});
  
  /**
   * number.gaussian(domain) - Transform this uniformly distributed number to be inside of a Gaussian distribution.
   *                           Calls the Box-Muller implementation but we could easily point to others here.
   * @param domain : {min,max} - The starting domain (min & max) for this number.
   * @param max : number - Max allowable value for this number, must be greater than the min and this number; defaults to 1.
   * @param min : number - Min allowable value for this number, must be lower than the max and this number; defaults to 0.
   * @return number - In the range [min,max]
   */
  if(Number.prototype.gaussian) mr.log.warn('Number.prototype.gaussian ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Number.prototype,'gaussian',{value:Number.prototype.boxMuller});

  /**
   * number.boxMuller(domain) - Use the Box-Muller method to transform this uniformly distributed number to be inside of a Gaussian distribution.
   * @param domain : {min,max} - The starting domain (min & max) for this number.
   * @param max : number - Max allowable value for this number, must be greater than the min and this number; defaults to 1.
   * @param min : number - Min allowable value for this number, must be lower than the max and this number; defaults to 0.
   * @return number - In the range [min,max]
   */
  if(Number.prototype.boxMuller) mr.log.warn('Number.prototype.boxMuller ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Number.prototype,'boxMuller',{value:function({min=0,max=1}={}){
    let v = 0;
    mr.assert(0<this && this<1);
    while(v===0) v = mr.rng();//Converting [0,1) to (0,1)
    return Math.sqrt(-2.0*Math.log(this))*Math.cos(2.0*Math.PI*v);//Box-Muller transform
  }});//boxMuller

  /**
   * number.int32 - Get this number as a signed 32-bit integer by using a sign-propagating right-shift.
   * @return number
   */
  if(Number.prototype.int32) mr.log.warn('Number.prototype.int32 ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Number.prototype,'int32',{value:(this >> 0)});
  
  /**
   * number.uint32 - Get this number as an unsigned 32-bit integer by using a zero-fill right-shift.
   * @return number
   */
  if(Number.prototype.uint32) mr.log.warn('Number.prototype.uint32 ALREADY EXISTS & IS BEING OVERWRITTEN');
  Object.defineProperty(Number.prototype,'uint32',{value:(this >>> 0)});
  
  /**
   * number.array(init) - Create an array of length equal to this number.
   * @param init : undefined|function|* - Callback function for initializing array values, or a constant value.
   *
  Number.prototype.array = function(init){
    return Array.from({length:this},(mr.is.func(init) && init) || (() => init));
  }//array
  */
  
  ////////////////////////////////
  // EXPORT
  ////////////////////////////////
  
  Object.keys(mr).forEach((x)=>{
    //mr.log.info('Exporting mr["'+x+'"]');
    if(mr.is.def(scope[x])) mr.log.warn('Overwriting with export of mr["'+x+'"]');
    scope[x] = mr[x];
  });//forEach
}//mrImport



////////////////////////////////
// TESTING
////////////////////////////////
function test(){
  //var mr = {};
  mrImport();//imports code into globalThis by default
  
  //function iterate
  
  //var id = '13Ah_CXXxQeUlR7SwK4vW9bklpZllg2Jzf3o3j47wNRw';
  
  rng.seed(1);
  let r = rng();
  log('r: '+r);
  let n = r.normalize();
  log('n: '+n);
  let g = r.gaussian();
  log('g: '+g);
  
  //log(rng.int({min:0,max:2,exclude:[0,1]}));//[min..max)
  //for(let i=0;i<4;++i) log(i+': '+rng.int());
  //for(let i=0;i<4;++i) log(i+': '+rng.int());
  //for(let i=0;i<4;++i) log(i+': '+rng.int());
  
  //var msg = '\nvalue\t\tisNaN\t\tisFinite\tNumber.isFinite\tmr.is.fin\n';
  //[0,'0','0A','A0A'].forEach(v=>{
  //  msg += JSON.stringify(v)+'\t\t'+isNaN(v)+'\t\t'+isFinite(v)+'\t\t'+Number.isFinite(v)+'\t\t'+isNumeric(v)+'\n';
  //});//forEach
  //log(msg);
  
  //var c = new cow();
  //c.talk('talk');
  //c.speak('speak');
  
  //mrImport(this);
  
  //var a = ['aaa','bbb','ccc','ddd'];
  //var b = (3).array((x,i)=>i);
  //log(a.mux(b));
  
  //iterate({
  //  file  : ss,//prop:'propName'
  //  func  : simulate,
  //  array : ss.sheets.judges.getSelected(),
  //  until : drive.warningRuntime<duration(entry).ms
  //});//iterate
  
  //var stack = getCallStack();
  //log('stack.display:\n'+stack.display);
  //log('stack:\n'+JSON.stringify(stack));
  
  //var ss = new drive.ss(id);
  //log(ss.sheets.responses.rows.max);
  //var ss2 = new drive.ss(id);
  //log(ss.url);
  
  //ss.sheets.responses.table.read();
  //ss.sheets.read(ss.sheets.responses);
  
  //ss.readTables(ss.sheets.responses);
  //log(ss.sheets.responses.table.timestamp.heading);
  //log(ss.sheets.responses.table.timestamp[0]);
  //log(ss.sheets.responses.table.timestamp[1]);
  
  //test.apply(this);
}
}


///*///EOF
