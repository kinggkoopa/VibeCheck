-- Add "best-practice" to the allowed optimization strategies

alter table public.prompt_optimizations
  drop constraint if exists prompt_optimizations_strategy_check;

alter table public.prompt_optimizations
  add constraint prompt_optimizations_strategy_check
  check (strategy in (
    'clarity','specificity','chain-of-thought','few-shot','role-based','best-practice'
  ));
