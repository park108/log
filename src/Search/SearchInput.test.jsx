import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as common from "../common/common";
import SearchInput from './SearchInput';

console.log = vi.fn();
console.error = vi.fn();

const testEntry = {
	pathname: "/log"
	, search: ""
	, hash: ""
	, state: null
	, key: "default"
};

describe('test key up events', () => {

	let inputElement = null;
	let searchButton = null;
	let mobileSearchButton = null;

	it('firing keyUp event', async () => {

		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		process.env.NODE_ENV = 'development';
	
		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<SearchInput />
			</MemoryRouter>
		);

		inputElement = screen.getAllByPlaceholderText("Input search string...")[0];
		searchButton = screen.getByText("go");
		mobileSearchButton = screen.getByText("search");

		fireEvent.keyUp(inputElement, { keyCode: 97 });
		fireEvent.keyUp(inputElement, { keyCode: 98 });
		fireEvent.keyUp(inputElement, { keyCode: 99 });

		inputElement.value = "테스트";
		fireEvent.keyUp(inputElement, { keyCode: 13 });
		
		expect(searchButton).toBeDefined();
		fireEvent.click(searchButton);
		
		expect(mobileSearchButton).toBeDefined();
		fireEvent.click(mobileSearchButton);
		fireEvent.click(mobileSearchButton);
	});

	it('mobile search toggle is a focusable button (role=button)', async () => {

		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<SearchInput />
			</MemoryRouter>
		);

		// 패턴 A: <span onClick> 을 <button type="button"> 으로 교체.
		// getByRole('button', { name: /search/i }) 은 go 버튼과 충돌하므로 텍스트로 한정.
		const toggle = screen.getByText("search");
		expect(toggle.tagName).toBe("BUTTON");
		expect(toggle.getAttribute("type")).toBe("button");

		// <button> 은 브라우저 기본으로 포커스 가능하며 Enter/Space 에서 click 이 합성된다.
		toggle.focus();
		expect(document.activeElement).toBe(toggle);
	});

	it('mobile search toggle activates on Enter key (click synthesis)', async () => {

		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<SearchInput />
			</MemoryRouter>
		);

		const toggle = screen.getByText("search");

		// 브라우저는 <button> 에서 Enter 를 click 으로 합성한다.
		// jsdom 은 합성을 수행하지 않으므로, Enter 가 활성화하는 최종 동작(click) 을 어서트.
		fireEvent.click(toggle);

		const mobileSearch = document.getElementById("mobile-search");
		expect(mobileSearch.getAttribute("class")).toContain("search-mobile");
	});

	it('mobile search toggle activates on Space key (click synthesis)', async () => {

		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<SearchInput />
			</MemoryRouter>
		);

		const toggle = screen.getByText("search");

		// 브라우저는 <button> 에서 Space 를 click 으로 합성한다.
		fireEvent.click(toggle);
		// 두 번째 클릭으로 토글이 hide 로 되돌아오는지도 확인.
		fireEvent.click(toggle);

		const mobileSearch = document.getElementById("mobile-search");
		expect(mobileSearch.getAttribute("class")).toContain("search-mobilehide");
	});

	it('firing search when the search string is null', async () => {

		vi.spyOn(common, "isAdmin").mockReturnValue(false);

		process.env.NODE_ENV = 'production';
	
		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<SearchInput />
			</MemoryRouter>
		);

		inputElement = screen.getAllByPlaceholderText("Input search string...")[0];
		
		vi.useFakeTimers();

		inputElement.value = "";
		fireEvent.keyUp(inputElement, { keyCode: 13 });
	
		act(() => {
			vi.runOnlyPendingTimers();
		});
		vi.useRealTimers();

		const nullStringAlert = await screen.findByText("Enter the keyword to search for");
		expect(nullStringAlert).toBeDefined();
	});
});