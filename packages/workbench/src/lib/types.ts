/** Component props plus the string args the helpers use for slots and CSS parts. */
export type StoryArgs<T> = Partial<T> & Record<string, unknown>;
