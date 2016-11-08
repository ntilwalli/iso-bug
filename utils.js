import {Observable as O, Subject, ReplaySubject} from 'rxjs'
import {nav, hr, div, a, input, form, strong, span, button} from '@cycle/dom'

export function spread(...arr) {
  return Object.assign({}, ...arr)
}

export function createProxy(){
  let sub
  const source = new Subject()
  const proxy = source.finally(() => {
    if (sub) {
      sub.unsubscribe()
    }
  }).publish().refCount()

  proxy.attach = (stream) => {
    sub = stream.subscribe(source)
  }

  return proxy
}

export function combineObj(obj) {
  const sources = [];
  const keys = [];
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      keys.push(key.replace(/\$$/, ''));
      sources.push(obj[key]);
    }
  }

  function toObj() {
    const argsLength = arguments.length;

    const combination = {};
    for (let i = argsLength - 1; i >= 0; i--) {
      combination[keys[i]] = arguments[i];
    }
    return combination;
  }

  return O.combineLatest(...sources, toObj)
    .map(x => {
      return x
    })
}

export function traceStartStop(id = '') {
  return source => source
    .startWith(`start`)
    .map(x => {
      if (x === `start`) {
        console.log(`starting ${id}`)
      }
      return x
    })
    .filter(x => x !== `start`)
    .finally(x => console.log(`ending ${id}`))
}

