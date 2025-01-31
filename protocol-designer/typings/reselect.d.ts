import type { OutputSelector, Selector } from 'reselect'
declare module 'reselect' {
  // declaring type for createSelector with 15 selectors because the reselect types only support up to 12 selectors
  export function createSelector<
    S,
    R1,
    R2,
    R3,
    R4,
    R5,
    R6,
    R7,
    R8,
    R9,
    R10,
    R11,
    R12,
    R13,
    R14,
    R15,
    T
  >(
    selector1: Selector<S, R1>,
    selector2: Selector<S, R2>,
    selector3: Selector<S, R3>,
    selector4: Selector<S, R4>,
    selector5: Selector<S, R5>,
    selector6: Selector<S, R6>,
    selector7: Selector<S, R7>,
    selector8: Selector<S, R8>,
    selector9: Selector<S, R9>,
    selector10: Selector<S, R10>,
    selector11: Selector<S, R11>,
    selector12: Selector<S, R12>,
    selector13: Selector<S, R13>,
    selector14: Selector<S, R14>,
    selector15: Selector<S, R15>,
    combiner: (
      res1: R1,
      res2: R2,
      res3: R3,
      res4: R4,
      res5: R5,
      res6: R6,
      res7: R7,
      res8: R8,
      res9: R9,
      res10: R10,
      res11: R11,
      res12: R12,
      res13: R13,
      res14: R14,
      res15: R15
    ) => T
  ): OutputSelector<
    S,
    T,
    (
      res1: R1,
      res2: R2,
      res3: R3,
      res4: R4,
      res5: R5,
      res6: R6,
      res7: R7,
      res8: R8,
      res9: R9,
      res10: R10,
      res11: R11,
      res12: R12,
      res13: R13,
      res14: R14,
      res15: R15
    ) => T
  >
}
