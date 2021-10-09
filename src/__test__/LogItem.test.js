import { render, screen } from '@testing-library/react';
import LogItem from '../Log/LogItem';

it('parse header tag correctly', () => {

  const contents = "header test contents";
  const markdownText = "## " + contents;

  render(<LogItem 
    key={"20211008195400"}
    author={"park108@gmail.com"}
    stamp={"20211008195400"}
    contents={markdownText}    
  />);
  
  const html = screen.getByText(contents).closest('h2');

  const expected = document.createElement("h2");
  expected.innerHTML = contents;

  expect(html).toStrictEqual(expected);
});

it('parse unordered list tag correctly', () => {

  const contents = "list item test contents";
  const markdownText = "- " + contents;

  render(<LogItem 
    key={"20211008195400"}
    author={"park108@gmail.com"}
    stamp={"20211008195400"}
    contents={markdownText}    
  />);
  
  const html = screen.getByText(contents).closest('ul');

  const expected = document.createElement("ul");
  const expectedChild = document.createElement("li");
  expectedChild.innerHTML = contents;
  expected.appendChild(expectedChild);

  expect(html).toStrictEqual(expected);
});

it('parse image tag correctly', () => {

  const url = "https://www.iana.org/_img/2022/iana-logo-header.svg"
  const titleText = "title text";
  const altText = "alternated text";
  const markdownText = "![" + altText + "](" + url + " \"" + titleText + "\")";

  render(<LogItem 
    key={"20211008195400"}
    author={"park108@gmail.com"}
    stamp={"20211008195400"}
    contents={markdownText}    
  />);
  
  const html = screen.getByRole('img');

  const expected = document.createElement("img");
  expected.setAttribute("src", url);
  expected.setAttribute("alt", altText);
  expected.setAttribute("title", titleText);

  expect(html).toStrictEqual(expected);
});