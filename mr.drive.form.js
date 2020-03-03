/*
* Construct a form object.
* @param {{id:'XYZ123'}} args
*        Object containing all the necessary named parameters:{
*          id:string | url:string | undefined
*          An identifier to locate the form; either an ID, URL, or nothing which will get the active form (if there is one).
*        }
* @returns new form
*
drive.form = function(args){
  args = args ? clone(args) : {};
  if(!this.properties)   this.properties = {};
  if(args.id||args.name) this.properties.form = profile(function(){return FormApp.openById(args.id)},'openById');
  else if(args.url)      this.properties.form = profile(function(){return FormApp.openByUrl(args.url)},'openByUrl');
  else                   this.properties.form = FormApp.getActive();//~2ms
  if(null===this.properties.form) throw new Error('No form found');
  args.id = this.properties.form.getId();//~1ms
  drive.file.call(this,args);//base class (~1ms)
  var thisForm = this;
  this.properties.type = MimeType.GOOGLE_FORMS;
  this.properties.url  = this.properties.form.getPublishedUrl();
}//drive.form
drive.form.prototype = Object.create(drive.file.prototype);//inherit from drive.file

//drive.form.prototype.getUrl = function(){return this.properties.url = this.properties.url||this.properties.form.getPublishedUrl()}

drive.form.prototype.getItems = function(){
  if(!this.properties.items){
    var thisForm = this;
    this.properties.items = this.properties.form.getItems().map(function(x){
      return new drive.form.item(x,thisForm);
    });//map
    //dialog('items[0].question: '+this.properties.items[0].question);
  }//if
  return this.properties.items;
}//getItems

drive.form.prototype.getResponses = function(){
  if(!this.properties.responses){
    var thisForm = this;
    this.properties.responses = this.properties.form.getResponses().map(function(x,i){
      return new drive.form.response(x,thisForm);
    });//map
  }//if
  return this.properties.responses;
}//getResponses

drive.form.prototype.findResponse = function(args){
  args = args||[];
  if(!isArray(args)) args = [args];
  var matches = [];
  this.properties.responses.forEach(function(x,i){
    var isMatch = true;
    args.forEach(function(y,j){if(x[y.question]!==y.answer) isMatch = false});
    if(isMatch) matches.push(x);
  });//forEach
  return matches;
}//findResponse

drive.form.prototype.createResponse = function(args){
  if(!args) return this.createRandomResponse();
  if(!isArray(args)) args = [args];
  var formResponse = new drive.form.response(null,this);//~70ms
  var thisForm = this;
  args.forEach(function(x,i){
    if(!x.answer) return log.warn('form.createResponse: question provided with no answer: '+x.question);
    var isMatch = false;
    thisForm.properties.items.forEach(function(y,j){
      if(y.question!==x.question) return;
      var itemResponse = y.createResponse(x.answer);//~50ms //x.answer must be the proper type!
      formResponse.withItemResponse(itemResponse);//~1ms
      isMatch = true;
    });//forEach
    if(!isMatch) log.warn('form.createResponse: question not found in form: '+x.question);
  });//forEach
  return formResponse;
}//createResponse

drive.form.prototype.createRandomResponse = function(args){
  var textNumeric = args && isString(args.text) && 'numeric'==args.text.toLowerCase();
  var newResponse = this.properties.form.createResponse();//~70ms
  var thisForm = this;
  this.getItems().forEach(function(x,i){
    var itemResponse,titleHasFirst,randomIndex,choices;
    var answer = null;
    switch(x.type){
      default:
        log.warn('form.createRandomResponse: unsupported item type: '+x.type);
        break;
      case FormApp.ItemType.MULTIPLE_CHOICE:
        choices = x.getChoices();
        randomIndex = rng({min:0,max:choices.length-1,type:'int'});
        answer = choices[randomIndex].value;
        break;
      case FormApp.ItemType.GRID:
        choices = x.getChoices();
        answer = [];
        x.item.getRows().forEach(function(y,j){
          randomIndex = rng({min:0,max:choices.length-1,type:'int'});
          answer.push(choices[randomIndex].value);
        });//forEach
        break;
      case FormApp.ItemType.PAGE_BREAK:
      case FormApp.ItemType.SECTION_HEADER:
        //do nothing
        break;
      case FormApp.ItemType.TEXT:
        if(textNumeric){
          answer = ''+rng({min:0,max:100,type:'int'});
          log('answer: '+answer+' ('+typeof answer+')');
        }else{
          titleHasFirst = 0<=x.question.indexOf("First");
          answer = randomName(titleHasFirst ? "first" : "last");
        }//else
        break;
      case FormApp.ItemType.LIST:
        choices = x.getChoices();
        randomIndex = rng({min:0,max:choices.length-1,type:'int'});
        answer = choices[randomIndex].value;
        break;
      case FormApp.ItemType.CHECKBOX:
        choices = x.getChoices();
        randomIndex = rng({min:0,max:choices.length-1,type:'int'});
        answer = [choices[randomIndex].value];
        break;
      case FormApp.ItemType.CHECKBOX_GRID:
        choices = x.getChoices();
        randomIndex = rng({min:0,max:choices.length-1,type:'int'});
        answer = [[choices[randomIndex].value]];
        break;
    }//switch
    if(answer){
      //log(x.question+': '+answer+' ('+typeof answer+')');
      itemResponse = x.item.createResponse(answer);
      newResponse.withItemResponse(itemResponse);
    }//if
  });//forEach
  return new drive.form.response(newResponse,this);
}//createRandomResponses

/*
* Get the choices on a specified question.
*
drive.form.prototype.getChoices = function(args){
  args = args||{};
  if(!isArray(args)) args = [args];
  var choices = [];
  var thisForm = this;
  this.getItems(args).forEach(function(x,i){
    var item = thisForm.getItemSpecific(x.item);
    if('function'==typeof item.getChoices) return choices.push(item.getChoices());
    if('function'==typeof item.getColumns) return choices.push(item.getColumns());
    log.warn('form.getChoices: no valid getChoices method was found');
  });//forEach
  return choices;
}//getChoices

/*
* Set the choices on a specified question.
*
drive.form.prototype.setChoices = function(args){
  args = args||{};
  if(!isArray(args)) args = [args];
  var allChoices = '';
  var items = this.getItems();
  args.forEach(function(x,i){
    items.forEach(function(y,j){
      if(y.title!==x.question) return;
      var item = drive.form.getItemSpecific(y.item);
      if('function'!=typeof item.setChoiceValues) return;
      item.setChoiceValues(x.choices||[]);
      if(0<allChoices.length) allChoices += ';';
      allChoices += (x.choices||[]).join(',');
    });//forEach
  });//forEach
  return allChoices;
}//setChoices

/*
* Merge responses found in linked sheet into the form's responses datastore.
* @param {{mergeDuplicateColumns:true,deleteDuplicateColumns:true}} args
*        Object containing all the necessary named parameters:{
*           mergeDuplicateColumns: boolean  True to merge duplicate columns, otherwise throw error.
*          deleteDuplicateColumns: boolesn  True to delete duplicate columns, otherwise leave them be.
*        }
* @returns True if successful, false otherwise.
*
//drive.form.prototype.mergeResponsesWithSheet = function(args){
//  //get linked sheet
//  for each response in form's datastore{
//    start an editResponse
//    for each question in response{
//      find matching sheet column
//      if multiple{
//        if !mergeDuplicateColumns throw error
//        merge columns so all look the same
//        if deleteDuplicateColumns{
//          attempt delete on each until only one remains
//        }
//      }
//      if sheet.value == response.value continue
//      add sheet.value to editResponse
//    }
//    submit editResponse
//  }
//}//mergeResponsesWithSheet


//////////////////////////////////////////////
//////////////////////////////////////////////
// drive.form.response
//////////////////////////////////////////////
//////////////////////////////////////////////

drive.form.response = function(response,form){
  this.form     = form;
  this.id       = response.getId();
  this.url      = response.getEditResponseUrl();
  this.time     = response.getTimestamp();
  this.email    = response.getRespondentEmail();
  this.response = response;
  var thisResponse = this;
  form.getItems().forEach(function(x,i){
    var itemResponse = response.getResponseForItem(x.itemBase);
    if(!itemResponse) return;
    thisResponse[x.question] = thisResponse[i] = itemResponse.getResponse();
  });//forEach
}//drive.form.response

drive.form.response.prototype.submit = function(){
  var limitsPerUser = this.form.properties.form.hasLimitOneResponsePerUser();
  var requiresLogin = this.form.properties.form.requiresLogin();
  var collectsEmail = this.form.properties.form.collectsEmail();
  this.form.properties.form.setLimitOneResponsePerUser(false);
  this.form.properties.form.setRequireLogin(false);
  this.form.properties.form.setCollectEmail(false);
  this.response.submit();
  this.form.properties.form.setLimitOneResponsePerUser(limitsPerUser);
  this.form.properties.form.setRequireLogin(requiresLogin);
  this.form.properties.form.setCollectEmail(collectsEmail);
}//submit

//////////////////////////////////////////////
//////////////////////////////////////////////
// drive.form.item
//////////////////////////////////////////////
//////////////////////////////////////////////

/*
* Construct a form item.
* @param item {Item} Reference to google item object (can be base class).
* @param form {Form} Reference to google form object.
* @return new form
*
* @member item {Item} Reference to google object of the derived type (not base class).
* @member id {string} Unique id provided by google.
* @member index {number} Where in the form this item resides.
* @member type {ItemType} Type of the item.
* @member question {string} The question this item poses.
* @member help {string} The help text of this item.
*
drive.form.item = function(item,form){
  this.form     = form;
  this.id       = item.getId();
  this.index    = item.getIndex();
  this.type     = item.getType();
  this.question = item.getTitle();
  this.help     = item.getHelpText();
  this.itemBase = item;
  this.item     = drive.form.item.asType(item);
}//drive.form.item

drive.form.item.prototype.getChoices = function(opt_force){
  if(true===opt_force) delete this.choices;
  if(this.choices) return this.choices;
  var choices = this.item.getChoices ? this.item.getChoices() : this.item.getColumns();
  var thisItem = this;
  return choices.map(function(x){return new drive.form.item.choice(x,thisItem)});
}//drive.form.item.prototype.getChoices

drive.form.item.prototype.setChoices = function(choices){
  log('setChoices: choices: '+JSON.stringify(choices));
  if(!isArray(choices) || !choices.length) return log.warn('drive.form.item.setChoices: invalid choices provided!');
  if(!this.item.createChoice || !this.item.setChoices) throw new Error('form.item.setChoices: this item does not support setChoices()');
  var thisItem = this;
  this.item.setChoices(choices.map(function(x,i){
    if(!isObject(x)){
      log('createChoice('+x+')');
      return thisItem.item.createChoice(x);
    }else if(isUndefined(x.nav)){
      log('createChoice('+x.value+')');
      return thisItem.item.createChoice(x.value);
    }else{
      log('createChoice('+x.value+','+(x.nav.page ? ('page: '+x.nav.page.item) : ('type: '+x.nav.type))+')');
      return thisItem.item.createChoice(x.value,x.nav.page.item||x.nav.type);
    }//else
  }));//setChoices
  return this;//for chaining
}//drive.form.item.prototype.setChoices

//////////////////////////////////////////////
//////////////////////////////////////////////
// drive.form.item.choice
//////////////////////////////////////////////
//////////////////////////////////////////////

/*
* Construct a form item choice.
* @member value {string} The text associated with this choice.
* @member isCorrect {boolean} Is this choice the "correct" answer?
* @member nav {null|{type,page}} Reference to where users go next in the form if this choice is made.
*
drive.form.item.choice = function(choice,item){
  if('object'!=typeof choice) return {item:item, choice:choice, value:choice, nav:null};
  this.item   = item;
  this.choice = choice;
  this.value  = choice.getValue();
  //log('new item.choice: value: '+this.value);
  if(choice.isCorrectAnswer()) log.warn('form.item.choice: isCorrectAnswer() is not yet supported');
  if(!choice.getPageNavigationType) this.nav = null;
  else this.nav = {type:choice.getPageNavigationType(), page:choice.getGotoPage()};
}//drive.form.item.choice


//////////////////////////////////////////
// utility functions
//////////////////////////////////////////

drive.form.item.asType = function(item){
  var type = item.getType();
  switch(type){
    default:                                throw new Error('Unexpected item type: '+type);
    case FormApp.ItemType.CHECKBOX:         return item.asCheckboxItem();
    case FormApp.ItemType.CHECKBOX_GRID:    return item.asCheckboxGridItem();
    case FormApp.ItemType.DATE:             return item.asDateItem();
    case FormApp.ItemType.DATETIME:         return item.asDateTimeItem();
    case FormApp.ItemType.DURATION:         return item.asDurationItem();
    case FormApp.ItemType.GRID:             return item.asGridItem();
    case FormApp.ItemType.IMAGE:            return item.asImageItem();
    case FormApp.ItemType.LIST:             return item.asListItem();
    case FormApp.ItemType.MULTIPLE_CHOICE:  return item.asMultipleChoiceItem();
    case FormApp.ItemType.PAGE_BREAK:       return item.asPageBreakItem();
    case FormApp.ItemType.PARAGRAPH_TEXT:   return item.asParagraphTextItem();
    case FormApp.ItemType.SCALE:            return item.asScaleItem();
    case FormApp.ItemType.SECTION_HEADER:   return item.asSectionHeaderItem();
    case FormApp.ItemType.TEXT:             return item.asTextItem();
    case FormApp.ItemType.TIME:             return item.asTimeItem();
    case FormApp.ItemType.VIDEO:            return item.asVideoItem();
  }//switch
}//asType

drive.form.item.hasAnswer = function(item){
  switch(item.getType()){
    case FormApp.ItemType.SECTION_HEADER:
    case FormApp.ItemType.PAGE_BREAK:
    case FormApp.ItemType.IMAGE:
    case FormApp.ItemType.VIDEO:
      return false;//we know that some types of items do not map to columns
  }//switch
  return true;
}//hasAnswer












///*///EOF
