// Type declarations for Cal.com embed
declare namespace JSX {
  interface IntrinsicElements {
    'cal-inline': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        'data-cal-link': string;
        'data-cal-config'?: string;
      },
      HTMLElement
    >;
  }
}
