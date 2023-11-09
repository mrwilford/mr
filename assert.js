export const error = msg => { throw new Error(msg) };
export const assert = (test, msg) => test || error(msg);

///* EOF *///
