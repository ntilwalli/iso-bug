import {Observable as O} from 'rxjs'
import {div, input} from '@cycle/dom'
import isolate from '@cycle/isolate'
import Immutable from 'immutable'
import {combineObj, spread, traceStartStop} from './utils'

function intent(sources) {
  const {DOM} = sources

  const input$ = DOM.select(`.appInput`).events(`keyup`)
    .map(ev => ev.target.value)
    .publishReplay(1).refCount()

  const blur$ = DOM.select(`.appInput`).events(`blur`)
    .publishReplay(1).refCount()

  return {
    input$,
    blur$
  }
}

const defaultParser = x => ({value: x, errors: []})

function reducers(actions, inputs) {
  const parser = inputs.parser || defaultParser
  const inputR = actions.input$.map(val => state => {
    const parsed = parser(val)
    console.log(val)
    return state.set(`value`, parsed.value)
      .set(`errors`, parsed.errors)
      .set(`isValid`, !!(parsed.value && parsed.errors.length === 0))
  })

  const blurR = inputs.props$.switchMap(props => {
    const required = !!props.required

    return actions.blur$.map(_ => state => {
      const val = state.get(`value`)
      if (required && (!val || val === "")) {
        return state.set(`errors`, [`Required`])
          .set(`isValid`, false)
      }

      return state
    })
  })

  const disabledR = inputs.disabled$.skip(1).map(val => state => {
    return state.set(`disabled`, val)
  })

  return O.merge(inputR, blurR, disabledR)
}

const log = console.log.bind(console)

function model(actions, inputs) {
  const reducer$ = reducers(actions, inputs)
  const parser = inputs.parser || defaultParser
  return combineObj({
      props$: inputs.initialText$.take(1),
      disabled$: inputs.disabled$.take(1)
    })
    .map((info) => {
      //console.log(`info smart text input:`, info)
      const {props, disabled} = info
      const parsed = parser(props)
      return Immutable.Map({
        value: parsed.value,
        errors: parsed.errors,
        isValid: !!(parsed.value && parsed.errors.length === 0),
        disabled
      })
    })
    .switchMap(init => {
      return reducer$.startWith(init).scan((acc, f) => f(acc))
    })
    .map((x) => x.toJS())
    .do(x => console.log(`textInput state:`, x))
    .publishReplay(1).refCount()
}

function view(state$, props$) {
  return combineObj({state$, props$}).map((info) => {
    const {state, props} = info
    const placeholder = props && props.placeholder ? props.placeholder : undefined
    const type = props && props.type === `password` ? props.type : `text`
    const autofocus = props && !!props.autofocus
    const name = props && props.name ? props.name : undefined
    const disabled = state.disabled
    const hasErrors = state.errors.length > 0
    const styleClass = props && props.styleClass || ``
    return div(`.smart-text-input`, [
      input(`.appInput.text-input${styleClass}`, {class: {disabled}, attrs: {placeholder, name, type, autofocus, value: state.parsedValue || state.value, disabled}}),
      hasErrors ? div(`.errors`, {style: {color: "red"}}, state.errors.map(x => div([x]))) : null
    ])
  })
}

function main(sources, inputs) {
  const props$ = inputs.props$ || O.of({})
  const initialText$ = inputs.initialText$ || O.of(undefined)
  const disabled$ = inputs.disabled$ || O.of(false)
  const parser = inputs.parser || defaultParser

  const enrichedInputs = spread(inputs, {parser, initialText$, disabled$})
  const actions = intent(sources)
  const state$ = model(actions, enrichedInputs)

  const vtree$ = view(state$, props$)
    .letBind(traceStartStop(`DOM trace`))

  const output$ = state$
      .map((state) => state.isValid ? state.value : undefined)
      .letBind(traceStartStop(`output$ trace`))
      .publishReplay(1).refCount()

  return {
    DOM: vtree$,
    output$
  }
}

export default isolate(main) 