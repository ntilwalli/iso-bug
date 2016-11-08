import Cycle from '@cycle/rxjs-run'
import {makeDOMDriver, div, input} from '@cycle/dom'
import isolate from '@cycle/isolate'
import {Observable as O} from 'rxjs'

import SmartTextInput from './smartTextInput'

function main(sources) {
  const usernameInputProps = O.of({
    placeholder: `Username`,
    name: `username`,
    autofocus: true,
    required: true,
    styleClass: `.auth-input`
  })

  return isolate(SmartTextInput)(sources, {props$: usernameInputProps})
}

Cycle.run(main, {
  DOM: makeDOMDriver('#app-main')
})