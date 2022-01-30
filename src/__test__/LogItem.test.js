import { render, screen } from '@testing-library/react';
import LogItem from '../Log/LogItem';

it('parse header tag correctly', () => {

  const contents = "header test contents";
  const markdownText = "## " + contents;

  render(<LogItem 
    author={"park108@gmail.com"}
    timestamp={"20211008195400"}
    contents={markdownText}
  />);
  
  const html = screen.getByText(contents).closest('h2');

  const expected = document.createElement("h2");
  expected.innerHTML = contents;

  expect(expected).toStrictEqual(html);
});

it('parse unordered list tag correctly', () => {

  const contents = "list item test contents";
  const markdownText = "- " + contents;

  render(<LogItem 
    author={"park108@gmail.com"}
    timestamp={"20211008195400"}
    contents={markdownText}    
  />);
  
  const html = screen.getByText(contents).closest('ul');

  const expected = document.createElement("ul");
  const expectedChild = document.createElement("li");
  expectedChild.innerHTML = contents;
  expected.appendChild(expectedChild);

  expect(expected).toStrictEqual(html);
});

it('parse ordered list tag correctly', () => {

  const contents = "list item test contents";
  const markdownText = "1. " + contents;

  render(<LogItem 
    author={"park108@gmail.com"}
    timestamp={"20211008195400"}
    contents={markdownText}    
  />);
  
  const html = screen.getByText(contents).closest('ol');

  const expected = document.createElement("ol");
  const expectedChild = document.createElement("li");
  expectedChild.innerHTML = " " + contents;
  expected.appendChild(expectedChild);

  expect(expected).toStrictEqual(html);
});

it('parse image tag correctly', () => {

  const url = "https://www.iana.org/_img/2022/iana-logo-header.svg"
  const titleText = "title text";
  const altText = "alternated text";
  const lazyLoading = "lazy";
  const markdownText = "![" + altText + "](" + url + " \"" + titleText + "\")";

  render(<LogItem 
    author={"park108@gmail.com"}
    timestamp={"20211008195400"}
    contents={markdownText}    
  />);
  
  const html = screen.getByRole('img');

  const expected = document.createElement("img");
  expected.setAttribute("src", url);
  expected.setAttribute("alt", altText);
  expected.setAttribute("loading", lazyLoading);
  expected.setAttribute("title", titleText);

  expect(expected).toStrictEqual(html);
});

it('parse anchor tag correctly', () => {

  const url = "https://exmaple.com"
  const titleText = "title text";
  const text = "linked text";
  const markdownText = "[" + text + "](" + url + " \"" + titleText + "\")";

  render(<LogItem 
    author={"park108@gmail.com"}
    timestamp={"20211008195400"}
    contents={markdownText}    
  />);
  
  const html = screen.getByText(text).closest('a');

  const expected = document.createElement("a");
  expected.setAttribute("href", url);
  expected.setAttribute("rel", "noreferrer");
  expected.setAttribute("target", "_blank");
  expected.setAttribute("title", titleText);
  expected.innerHTML = text;

  expect(expected).toStrictEqual(html);
});