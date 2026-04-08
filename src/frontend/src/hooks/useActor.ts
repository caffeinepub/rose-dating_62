import { useActor as useActorBase } from "@caffeineai/core-infrastructure";
import { type Backend, createActor } from "../backend";

export function useActor() {
  return useActorBase<Backend>(createActor);
}
