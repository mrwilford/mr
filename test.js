mr(globalThis);//TODO: make extendPrototypes() optional

const ssId           = '1vs1PyOJipA20xyrWoUJgG660XP6b5nWoVvexfLRusNk';
const ssUrl          = 'https://docs.google.com/spreadsheets/d/1vs1PyOJipA20xyrWoUJgG660XP6b5nWoVvexfLRusNk/edit#gid=0';
const docId          = '1ceSXVh-WSif9xl1gHdPRHHncBelXuNtYAE4VTGO02fM';
const presentationId = '1sf2J-i4PwB2UEvu-u3sNDfP6sy602yQO70ZXbuO4vUs';
const siteId         = '12K8t2sRhJ-amECwTYVCmPODAlITwmZ3L';
const folderId       = '0BwzP1xBdcn0Nb2s5bWZkVFQxVGc';
const fileId         = '1vs1PyOJipA20xyrWoUJgG660XP6b5nWoVvexfLRusNk';
const jpgId          = '1a7wel_ObbRAXbug9Ri9wxF6FOeAWxiJs';
const triggerId      = '4616076814456607965';

function moo(){
  log(is(triggerId, $Id));
  // log([ 1,2,3,4 ].loop(x => x%2 ? x : BREAK));
  // log({ moo:'cow', fu:'bar' }.loop(x => 4==x.length ? CONTINUE : x));
};//moo

function T(id, result, expected){
  ++T.state.numTest;
  const strResult = is(result, Function) ? result : (is(result, Array) ? JSON.stringify(result) : result);
  const strExpect = is(expected, Function) ? expected : (is(expected, Array) ? JSON.stringify(expected) : expected);
  const strDuration = '';//' ['+mr.duration({name:'T'}).as('ms')+'ms]';
  if(strResult !== strExpect){
    log.warn('❌ FAILED: ' + id + ': ' + strResult + ' =!= ' + strExpect + strDuration);
    return;
  }//if
  ++T.state.numPass;
  log('✅ PASSED: ' + id + ': ' + strExpect + strDuration);
}//T
T.state = { numTest: 0, numPass: 0 };

function testAll() {
  log('Start: '+Began.toLocaleString(DateTime.DATETIME_MED));
  const testIterator = {
    hasNext: () => true,
    next: () => {
      testIterator.hasNext = () => true;
      testIterator.next = () => {
        testIterator.hasNext = () => true;
        testIterator.next = () => {
          testIterator.hasNext = () => false;
          testIterator.next = null;
          return 3;
        };//next
        return 2;
      };//next
      return 1;
    },//next
  };//testIterator
  {
    //------ TEST DESCRIPTION ------ TEST CODE ---------------------------- EXPECTED RESULT -----------
    // T('callstack.file'              ,file                                ,'test');
    // T('callstack.caller'            ,caller                              ,'testAll');
    // T('callstack.line'              ,line                                ,'52');
    // T('is([3,5,7])'                 ,is([3,5,7]).name                    ,mr.array.name);
    T('is.prim'                     ,is(5, Primitive)                       ,true);
    T('is.prim'                     ,is(new Number(5), Primitive)           ,false);
    T('!is.prim'                    ,is([], Primitive)                      ,false);
    T('is.fin'                      ,is(5, Finite)                          ,true);
    T('!is.fin'                     ,is([], Finite)                         ,false);
    T('is.num'                      ,is(5, Number)                          ,true);
    T('!is.num'                     ,is([], Number)                         ,false);
    T('is.obj'                      ,is({}, Object)                         ,true);
    T('!is.obj'                     ,is(5, Object)                          ,false);
    T('is.err'                      ,is(new Error('!'), Error)              ,true);
    T('is.err'                      ,is({}, Error)                          ,false);
    T('!is.err'                     ,is(5, Error)                           ,false);
    T('is.arr'                      ,is([], Array)                          ,true);
    T('!is.arr'                     ,is(5, Array)                           ,false);
    T('is.str'                      ,is('5', String)                        ,true);
    T('is.str(new)'                 ,is(new String(''), String)             ,true);
    T('!is.str'                     ,is({}, String)                         ,false);
    T('is.func'                     ,is(function () { }, Function)          ,true);
    T('is.func(=>)'                 ,is(() => 1, Function)                  ,true);
    T('is.date'                     ,is(new Date(), Date)                   ,true);
    T('is.date(time)'               ,is(Date.now(), Date)                   ,false);
    // T('is.obj.empty'                ,is.obj.empty({})                    ,true);
    // T('!is.obj.empty'               ,is.obj.empty({ a: 5 })              ,false);
    return;
    T('numbers([3,x5a])'            ,JSON.stringify(mr.numbers([3,'x5a']))  ,[3,5]);
    T('numbers(Infinity)'           ,JSON.stringify(mr.numbers(Infinity))   ,[]);
    T('boolean(true)'               ,mr.boolean('true')                     ,true);
    T('boolean(👍)'                 ,mr.boolean('👍')                       ,true);
    T('boolean([1])'                ,mr.boolean([1])                        ,true);
    T('boolean([1,3])'              ,mr.boolean([1, 3])                     ,false);
    T('boolean({a})'                ,mr.boolean({ a: 1 })                   ,true);
    T('boolean({a,b})'              ,mr.boolean({ a: 1, b: 3 })             ,false);
    T('enum'                        ,JSON.stringify(mr.enum('A','b',3))     ,'{"3":3,"A":"A","b":"b"}');
    T('swap'                        ,JSON.stringify(mr.swap(11,37))         ,[37,11]);
    T('hourToMs'                    ,mr.hourToMs(5)                         ,5 * 60 * 60 * 1000);
    T('minToMs'                     ,mr.minToMs(7)                          ,7 * 1 * 60 * 1000);
    T('secToMs'                     ,mr.secToMs(9)                          ,9 * 1 * 1 * 1000);
    T('date'                        ,mr.date('2020-01-01').toString()       ,'2020-01-01T00:00:00.000-06:00');
    T('serial'                      ,mr.serial(new Date('1/1/2020 9:00'))   ,43831.375);
    T('serial==date'                ,mr.date(43831.375).toISO()             ,'2020-01-01T09:00:00.000-06:00');
    T('string'                      ,mr.string(Infinity)                    ,'Infinity');
    T('str.has'                     ,mr.str.has('abc', 'b')                 ,1);
    T('!str.has'                    ,mr.str.has('abc', 'd')                 ,0);
    T('str.nonblank'                ,mr.str.nonblank(' !	')                 ,true);
    T('!str.nonblank'               ,mr.str.nonblank(' \n	\t ')            ,false);
    T('str.count'                   ,mr.str.count('abbbba', 'bb')           ,2);
    T('str.count(overlap)'          ,mr.str.count('abbbba', 'bb', true)     ,3);
    T('str.left(+)'                 ,mr.str.left('abc', 1)                  ,'a');
    T('str.left(-)'                 ,mr.str.left('abc', -1)                 ,'ab');
    T('str.right(+)'                ,mr.str.right('abc', 1)                 ,'bc');
    T('str.right(-)'                ,mr.str.right('abc', -1)                ,'c');
    T('str.mid(+)'                  ,mr.str.mid('abc', 1, 8)                ,'bc');
    T('str.mid(-)'                  ,mr.str.mid('abc', -1)                  ,'c');
    T('str.insert(+)'               ,mr.str.insert('abc', 'x', 1)           ,'axbc');
    T('str.insert(-)'               ,mr.str.insert('abc', 'x', -1)          ,'abxc');
    T('str.hash'                    ,mr.str.hash('abc')                     ,96354);
    T('str.lower'                   ,mr.str.lower('aBc')                    ,'abc');
    T('str.upper'                   ,mr.str.upper('aBc')                    ,'ABC');
    T('str.camel'                   ,mr.str.camel('🔥THE QUICK brown f0x')  ,'theQuickBrownF0x');
    T('str.pascal'                  ,mr.str.pascal('•THE QUICK brown f0x')  ,'TheQuickBrownF0x');
    T('str.snake'                   ,mr.str.snake('¼THE QUICK brown f0x')   ,'the_quick_brown_f0x');
    T('str.kebab'                   ,mr.str.kebab('✔THE QUICK brown f0x')   ,'the-quick-brown-f0x');
    T('str.findClosing'             ,mr.str.findClosing('abc{defg}hi', 3)   ,8);
    T('str.findClosing(tag)'        ,mr.str.findClosing('a<d></d>',1,true)  ,4);
    T('array([1,2,3])'              ,mr.arr([1, 2, 3])                      ,[1,2,3]);
    T('array(1,2,3)'                ,mr.arr( 1, 2, 3 )                      ,[1,2,3]);
    T('array({a:1,b:2})'            ,mr.arr({a:1,b:2})                      ,[1,2]);
    T('array(iterator)'             ,mr.arr(testIterator)                   ,[1,2,3]);
    T('arr.set'                     ,mr.arr.set([1,2],3,3)                  ,[1,2,null,3]);
    T('union'                       ,mr.union([1,2],[2,3])                  ,[1,2,3]);
    T('intersect'                   ,mr.intersect([1,2],[2])                ,[2]);
    T('subtract'                    ,mr.diff([1,2],[2,3])                   ,[1]);
    T('[7].uno'                     ,[7].uno                                ,7);
    T('num.rng.seed'                ,mr.num.rng.seed = 5150                 ,5150);
    T('num.rng'                     ,mr.num.rng()                           ,0.1110536059915231);
    T('num.rng(dist.normal)'        ,mr.num.rng({dist:mr.num.dist.normal})  ,0.9902355756471308);
    T('num.rng(int)'                ,mr.num.rng({int:true})                 ,35);
    T('num.rng(exclude)'            ,mr.num.rng({int:true,exclude:[49]})    ,29);
    //DRIVE
    const ss = mr.drive(ssId).read();
    T('ss.values.sheet8.dog'        ,ss.values.sheet8.dog                   ,['woof','bark','bowwow','wimper']);
    T('ss.sheets.sheet2.frozenRows' ,ss.sheets.sheet2.frozenRows            ,1);
    T('ss.sheets.sheet2.headings[1]',ss.sheets.sheet2.headings[1]           ,ss.headings.sheet2[1]);
    T('ss.formulas.sheet2["D"]'     ,ss.formulas.sheet2['D']                ,['=asdf']);

    //TODO: implement distribution to int rng

  }
  const durationMsg = ' in '+mr.duration().as('ms')+'ms';
  if (T.state.numPass == T.state.numTest) return console.info('✅ ALL '+T.state.numTest+' TESTS PASSED'+durationMsg);
  console.error('❌ '+(T.state.numTest-T.state.numPass)+' of '+T.state.numTest+' TESTS FAILED'+durationMsg);
}//testAll


function testRef(){

  const ss = mr.drive(ssId);
  mr.profile(() => ss.read(),'ss.read');

  log('num sheets: '+ss.sheets.length);
  log('sheet2 index: '+ss.sheets.sheet2.index);
  log('sheet2 headings: '+ss.sheets.sheet2.headings);
  log(JSON.stringify(ss.values.sheet2['D']));
  return;

  log(JSON.stringify(ss.values.sheet8.dog));
  //log(JSON.stringify(ss.values.sheet8.dog.filter(x => 4==x.length)));
  //log(JSON.stringify(ss.values.sheet8.dog.loop(i => 4==i.elem.length ? i.elem : loop.continue).elems));

  log(JSON.stringify(ss.values.sheet8.dog.loop(i => 
    ss.values.sheet9.numLetters.match(ss.values.sheet9.sound, i.elem)
  ).elems));

  log(JSON.stringify(
    ss.values.sheet9.numLetters.match(ss.values.sheet9.sound,ss.values.sheet8.dog)
  ));//log

}//testRef























