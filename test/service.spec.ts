import { expect } from 'chai';
import 'mocha';
import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import { CompanyService, MockRequestProvider, Company } from './fixture';
import { ODataService } from '..';
import { ODataQueryProvider } from '../lib/odata-query-provider';

chai.use(chaiAsPromised);

describe('Service tests', () => {

    const provider = new MockRequestProvider();
    const service = new CompanyService(provider);

    it('should create with default parameters', async () => {
        const svc = new ODataService();
        expect(svc).to.not.null;
    });

    it('should throw for sync execution', async () => {
        const svc = new ODataQueryProvider(service);
        expect(() => svc.execute([])).to.throw();
    });

    it('should throw for unknown part', async () => {
        const svc = new ODataQueryProvider(service);
        expect(() => svc.execute([{ type: 'UNKNOWN', args: [], scopes: [] }])).to.throw();
    });

    it('should throw for unsupported expression', async () => {
        const query = service.companies().where(c => c.name[1] === 'a');
        expect(() => query.toArrayAsync()).to.throw();
    });

    it('should handle missing parameters', async () => {
        const svc = new ODataService(null, provider);
        expect(svc.request(null, null)).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        expect(url).is.undefined;
    });

    it('should handle base address', async () => {
        const svc1 = new ODataService('', provider);
        const query1 = svc1.createQuery<Company>('Companies');
        expect(query1.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url1 = provider.options.url;
        expect(url1).equal('Companies');

        const svc2 = new ODataService('api/', provider);
        const query2 = svc2.createQuery<Company>('Companies');
        expect(query2.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url2 = provider.options.url;
        expect(url2).equal('api/Companies');

        const svc3 = new ODataService('api/', provider);
        const query3 = svc3.createQuery<Company>('');
        expect(query3.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url3 = provider.options.url;
        expect(url3).equal('api/');
    });

    it('should handle empty request', async () => {
        const query = service.companies();
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = 'api/Companies';
        expect(url).equal(expectedUrl);
    });

    it('should handle header (options)', async () => {
        const query = service.companies().withOptions({ headers: { 'Auth': '12345' } });
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        expect(provider.options.headers).property('Auth').is.equal('12345');
    });

    it('should handle query parameter', async () => {
        const query = service.companies().setParameter('id', 5);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = 'api/Companies?id=5';
        expect(url).equal(expectedUrl);
    });

    it('should handle inline count', async () => {
        const query = service.companies().inlineCount();
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$inlinecount=allpages`;
        expect(url).equal(expectedUrl);
    });

    it('should handle filter parameter', async () => {
        const query = service.companies()
            .where(c => c.id === 4 && (!c.addresses.any(a => a.id > 1000) || c.addresses.all(a => a.id >= 1000)));
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm = 'id eq 4 and (not addresses/any(a: a/id gt 1000) or addresses/all(a: a/id ge 1000))';
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle order and then descending parameters', () => {
        const query = service.companies().orderBy(c => c.id).thenByDescending(c => c.name);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$orderby=${encodeURIComponent('id,name desc')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle order descending and then ascending parameters', () => {
        const query = service.companies().orderByDescending(c => c.id).thenBy(c => c.name);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$orderby=${encodeURIComponent('id desc,name')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle select', () => {
        const query = service.companies();
        expect(query.select(c => ({ ID: c.id, NAME: c.name, count: c.addresses.count() }))).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$select=${encodeURIComponent('id as ID,name as NAME,addresses/$count as count')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle select with ternary', () => {
        const query = service.companies();
        expect(query.select(c => ({ ID: c.id, NAME: c.name, STATE: c.deleted ? 'DELETED' : '' }))).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$select=${encodeURIComponent('id as ID,name as NAME,deleted ? "DELETED" : "" as STATE')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle expand with multi level', () => {
        const query = service.companies().expand(c => c.addresses.$expand(a => a.city).country);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent('addresses/city/country')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle expand with multi level using strings 1', () => {
        const query = service.companies().expand('addresses.city.country');
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent('addresses/city/country')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle expand with multi level using strings 2', () => {
        const query = service.companies().expand('c => c.addresses.city.country');
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent('addresses/city/country')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle expand with multi level using strings 3', () => {
        const query = service.companies().expand('c => c.addresses.$expand(a => a.city).country');
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent('addresses/city/country')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle expand with multi level with explicit calls', () => {
        const query = service.companies()
            .expand(c => c.addresses)
            .expand(c => c.addresses.$expand(a => a.city))
            .expand(c => c.addresses.$expand(a => a.city).country);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent('addresses/city/country')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle expand with multi level with explicit calls and selects', () => {
        const query = service.companies()
            .expand(c => c.addresses, a => a.city)
            .expand(c => c.addresses.$expand(a => a.city), c => c.country)
            .expand(c => c.addresses.$expand(a => a.city).country, c => c.name);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm = 'addresses($expand=city($expand=country($select=name),$select=country),$select=city)';
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle expand with multi level with explicit calls and mixed selects', () => {
        const query = service.companies()
            .expand(c => c.addresses, a => a.city)
            .expand(c => c.addresses.$expand(a => a.city))
            .expand(c => c.addresses.$expand(a => a.city).country, c => c.name);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm = 'addresses($expand=city/country($select=name),$select=city)';
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle skip and top', async () => {
        const query = service.companies().skip(20).top(10);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = 'api/Companies?$skip=20&$top=10';
        expect(url).equal(expectedUrl);
    });

    it('should handle count', () => {
        const query = service.companies();
        expect(query.count()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        expect(url).equal('api/Companies/$count');
    });

    it('should handle count with filter', () => {
        const query = service.companies();
        expect(query.count(c => c.id > 5)).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies/$count/?$filter=${encodeURIComponent('id gt 5')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle groupby', () => {
        const query = service.companies();
        expect(query.groupBy(c => ({ deleted: c.deleted }))).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = 'api/Companies?$apply=groupby((deleted))';
        expect(url).equal(expectedUrl);
    });

    it('should handle groupby with count aggregation', () => {
        const query = service.companies();
        const promise = query.groupBy(c => ({ deleted: c.deleted }), g => ({ deleted: g.deleted, count: g.count() }));
        expect(promise).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$apply=${encodeURIComponent('groupby((deleted),aggregate(deleted,$count as count))')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle groupby with sum aggregation', () => {
        const query = service.companies();
        const promise = query.groupBy(c => ({ deleted: c.deleted }), g => ({ deleted: g.deleted, sumId: g.sum(x => x.id) }));
        expect(promise).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$apply=${encodeURIComponent('groupby((deleted),aggregate(deleted,id with sum as sumId))')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle length', async () => {
        const query = service.companies().where(c => c.name.length < 5);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent('length(name) lt 5')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle round function', async () => {
        const query = service.companies().where(c => Math.round(c.id) <= 5);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent('round(id) le 5')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle substringof function', async () => {
        const query = service.companies().where(c => c.name.includes('flix'));
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent('substringof("flix", name)')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle other operators', async () => {
        const query = service.companies().where(c => ((c.id + 4 - 2) * 4 / 2) % 2 == 1 && c.id != 42 && -c.id !== 19);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm = '((id add 4 sub 2) mul 4 div 2) mod 2 eq 1 and id ne 42 and -id ne 19';
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);
    });
});
