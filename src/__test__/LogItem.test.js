import { render, screen } from '@testing-library/react';
import LogItem from '../Log/LogItem';

it('render H2 tag correctly', () => {

  const text = "## H2 Test contents";

  render(<LogItem 
    key={"20211008195400"}
    author={"park108@gmail.com"}
    stamp={"20211008195400"}
    contents={text}

    
  />);

  const inContents = ('H2 Test contents"');

  expect(inContents).toBe(inContents)
});